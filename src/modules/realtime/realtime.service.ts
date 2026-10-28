import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Order } from '../order/entities/order.entity';
import {
  Device,
  RegistrationStatusEnum,
} from '../device/entities/device.entity';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeEvent, Rooms } from './realtime.events';

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
    this.gateway.emit(Rooms.device(device.id), RealtimeEvent.DEVICE_STATUS, {
      status: device.registrationStatus,
    });

    if (device.registrationStatus !== RegistrationStatusEnum.REGISTERED)
      await this.gateway.revokeDeviceSessions(
        device.id,
        `Device is ${device.registrationStatus.toLowerCase()}`,
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
    await this.gateway.revokeDeviceSessions(deviceId, 'Device was removed');
  }

  // The user's status, role or role assignment changed.
  userChanged(userId: string) {
    return this.gateway.refreshUser(userId);
  }

  async usersChanged(userIds: string[]) {
    await Promise.all(userIds.map((id) => this.gateway.refreshUser(id)));
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
