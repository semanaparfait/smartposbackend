import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Order } from '../order/entities/order.entity';
import {
  Device,
  DeviceTypeEnum,
  deviceMomoCode,
  RegistrationStatusEnum,
} from '../device/entities/device.entity';
import { Cart } from '../cart/entities/cart.entity';
import { Item } from '../item/entities/item.entity';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeEvent, Rooms } from './realtime.events';
import { DisplayCart } from './display-cart';

// What the rest of the app calls to push changes to connected clients. Call it
// after the change is saved (outside transactions), so clients that refetch on
// an event see the new data.
@Injectable()
export class RealtimeService {
  constructor(
    private readonly gateway: RealtimeGateway,
    private readonly dataSource: DataSource,
  ) {}

  // `order` should be the full order (as GET /orders/:id returns it).
  orderCreated(order: Order) {
    this.emitOrder(RealtimeEvent.ORDER_CREATED, order);
  }

  orderUpdated(order: Order) {
    this.emitOrder(RealtimeEvent.ORDER_UPDATED, order);
  }

  // Tells the device itself (e.g. a customer display after its till's MoMo code
  // changed). `device.displayFor` must be loaded.
  deviceStatus(device: Device) {
    this.gateway.emit(Rooms.device(device.id), RealtimeEvent.DEVICE_STATUS, {
      status: device.registrationStatus,
      type: device.type,
      displayForId: device.displayFor?.id ?? null,
      momoCode: deviceMomoCode(device),
    });
  }

  deviceRequested(device: Device) {
    this.gateway.emit(
      this.deviceManagers(device.company?.id),
      RealtimeEvent.DEVICE_REQUESTED,
      { device },
    );
  }

  // After approve / reject / enable / disable. Anyone signed in on a device that
  // is no longer registered is signed out.
  async deviceUpdated(device: Device) {
    this.gateway.emit(
      this.deviceManagers(device.company?.id),
      RealtimeEvent.DEVICE_UPDATED,
      { device },
    );
    this.deviceStatus(device);

    await this.gateway.syncTerminal({
      id: device.id,
      type: device.type,
      registrationStatus: device.registrationStatus,
      displayForId: device.displayFor?.id ?? null,
    });

    if (device.registrationStatus !== RegistrationStatusEnum.REGISTERED)
      await this.gateway.revokeDeviceSessions(
        device.id,
        `Device is ${device.registrationStatus.toLowerCase()}`,
      );
    else if (device.type === DeviceTypeEnum.CUSTOMER_DISPLAY)
      // Nobody works on a customer display.
      await this.gateway.revokeDeviceSessions(
        device.id,
        'This device is now a customer display',
      );
  }

  async deviceRemoved(deviceId: string, companyId?: string) {
    this.gateway.emit(
      this.deviceManagers(companyId),
      RealtimeEvent.DEVICE_REMOVED,
      { id: deviceId },
    );
    this.gateway.emit(Rooms.device(deviceId), RealtimeEvent.DEVICE_STATUS, {
      status: null,
    });
    await this.gateway.detachTerminal(deviceId);
    await this.gateway.revokeDeviceSessions(deviceId, 'Device was removed');
  }

  // The user's status, role or role assignment changed.
  userChanged(userId: string) {
    return this.gateway.refreshUser(userId);
  }

  async usersChanged(userIds: string[]) {
    await Promise.all(userIds.map((id) => this.gateway.refreshUser(id)));
  }

  // Ends the user's sockets from other sessions. Sockets on `deviceId` are left
  // alone: that is the device they just signed in on.
  signedInElsewhere(userId: string, sid: string, deviceId?: string) {
    return this.gateway.revokeOtherSessions(userId, sid, deviceId);
  }

  revokeUser(userId: string, reason: string) {
    this.gateway.revokeUser(userId, reason);
  }

  // Logins of the employees that have this role (read before deleting a role).
  async usersWithRole(roleId: string): Promise<string[]> {
    const rows: { id: string }[] = await this.dataSource.query(
      `SELECT u.id FROM users u JOIN employees e ON e.id = u.employee_id
        WHERE e.role_id = $1`,
      [roleId],
    );

    return rows.map((r) => r.id);
  }

  // ---------- customer displays ----------
  // `tillId` is the device (Device.id) of whoever made the change.

  cartChanged(tillId: string | undefined, cart: Cart) {
    this.toDisplays(tillId, RealtimeEvent.DISPLAY_CART, {
      cart: {
        id: cart.id,
        items: displayItems(cart.items),
        total: Number(cart.totalAmount),
      } satisfies DisplayCart,
      cashier: cart.user?.name ?? null,
    });
  }

  orderToPay(tillId: string | undefined, order: Order) {
    this.toDisplays(tillId, RealtimeEvent.DISPLAY_ORDER, {
      order: displayOrder(order),
      cashier: order.user?.name ?? null,
    });
  }

  orderPaid(tillId: string | undefined, order: Order) {
    this.toDisplays(tillId, RealtimeEvent.DISPLAY_PAID, {
      order: {
        ...displayOrder(order),
        payments: (order.payments ?? []).map((p) => ({
          method: p.method,
          amount: Number(p.amount),
        })),
      },
      cashier: order.user?.name ?? null,
    });
  }

  displayCleared(tillId: string | undefined) {
    this.toDisplays(tillId, RealtimeEvent.DISPLAY_CLEARED, {});
  }

  // Displays sit in their till's room (see RealtimeGateway), so no lookup is
  // needed and the event goes out at once.
  private toDisplays(
    tillId: string | undefined,
    event: string,
    payload: unknown,
  ) {
    if (tillId) this.gateway.emit(Rooms.display(tillId), event, payload);
  }

  private emitOrder(event: string, order: Order) {
    const rooms = [Rooms.admin];

    if (order.company?.id) rooms.push(Rooms.orders(order.company.id));
    if (order.user?.id) rooms.push(Rooms.user(order.user.id));

    this.gateway.emit(rooms, event, order);
  }

  private deviceManagers(companyId?: string | null) {
    return companyId ? [Rooms.devices(companyId), Rooms.admin] : [Rooms.admin];
  }
}

// What a customer may see of the items: no buying prices or stock details.
function displayItems(items: Item[] = []) {
  return items.map((item) => ({
    name: item.product?.name ?? '',
    image: item.product?.images?.[0]?.originalUrl ?? null,
    quantity: item.quantity,
    unitPrice: Number(item.product?.sellingPrice),
    total: Number(item.totalPrice),
  }));
}

function displayOrder(order: Order) {
  return {
    id: order.id,
    status: order.status,
    items: displayItems(order.items),
    subtotal: Number(order.subtotal),
    tax: Number(order.tax),
    total: Number(order.total),
  };
}
