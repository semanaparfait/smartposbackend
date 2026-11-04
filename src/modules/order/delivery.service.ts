import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Payload } from 'src/util/token.service';
import {
  scopeCompanyId,
  targetCompanyId,
} from 'src/common/utils/company-scope';
import { hasPermission } from 'src/common/permissions/permissions';
import { Company } from '../company/entities/company.entity';
import { ensureReadyRole, READY_ROLES } from '../employee/ready-roles';
import { User, UserRole } from '../user/entities/user.entity';
import { RealtimeService } from '../realtime/realtime.service';
import {
  DeliveryStatusEnum,
  Order,
  OrderStatusEnum,
  OrderTypeEnum,
} from './entities/order.entity';
import {
  DeliveredDto,
  DeliveryDetailsDto,
  DeliverySettingsDto,
  NotDeliveredDto,
  SendDeliveryDto,
} from './dto/request/delivery.dto';
import { OrderService } from './order.service';

const OPEN = [DeliveryStatusEnum.WAITING, DeliveryStatusEnum.ON_THE_WAY];

const toCents = (amount: number) => Math.round(Number(amount) * 100);

// Only workers given the permission on purpose; roles saved without a list
// (which allow everything) would make every worker a rider.
const canRide = (permissions: string[] | null | undefined) =>
  (permissions ?? []).includes('deliveries.ride');

// The signed-in worker is one of the shop's riders.
const isRider = (user: Payload) =>
  user.role === UserRole.EMPLOYEE && canRide(user.permissions);

@Injectable()
export class DeliveryService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly dataSource: DataSource,
    private readonly orders: OrderService,
    private readonly realtime: RealtimeService,
  ) {}

  // The delivery part of a new order, priced from the owner's settings (the till
  // can't choose the fee).
  async prepare(
    manager: EntityManager,
    companyId: string,
    dto: DeliveryDetailsDto,
  ): Promise<Partial<Order>> {
    const company = await manager.findOneOrFail(Company, {
      where: { id: companyId },
    });

    if (!company.deliveryEnabled)
      throw new BadRequestException(
        'Delivery is turned off. The owner can turn it on in Settings',
      );

    const areas = company.deliveryAreas ?? [];
    let fee = Number(company.deliveryFee) || 0;
    let area: string | null = null;

    if (areas.length) {
      const match = areas.find(
        (a) => a.name.toLowerCase() === dto.area?.trim().toLowerCase(),
      );
      if (!match) throw new BadRequestException('Choose a delivery area');
      fee = Number(match.fee) || 0;
      area = match.name;
    }

    if (dto.riderId) await this.assertRider(manager, companyId, dto.riderId);

    return {
      type: OrderTypeEnum.DELIVERY,
      deliveryStatus: DeliveryStatusEnum.WAITING,
      deliveryFee: fee,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone || null,
      deliveryAddress: dto.address || null,
      deliveryArea: area,
      payOnDelivery: dto.payOnDelivery,
      rider: dto.riderId ? ({ id: dto.riderId } as User) : null,
      outsideRider: dto.riderId ? null : dto.outsideRider || null,
      note: dto.note || undefined,
    };
  }

  // Deliveries still on their way or waiting, plus those since `since`.
  // Managers see all; others the ones they made or carry. Riders also see the
  // waiting ones nobody has taken, so they can pick them.
  async list(user: Payload, since?: string) {
    this.assertCanUse(user);
    const company = scopeCompanyId(user);
    const from = since ? new Date(since) : startOfToday();

    const query = this.orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.items', 'item')
      .leftJoinAndSelect('item.product', 'product')
      .leftJoinAndSelect('product.images', 'image')
      .leftJoinAndSelect('o.user', 'user')
      .leftJoinAndSelect('user.employee', 'employee')
      .leftJoinAndSelect('o.rider', 'rider')
      .leftJoinAndSelect('rider.employee', 'riderEmployee')
      .leftJoinAndSelect('o.collectedBy', 'collectedBy')
      .leftJoinAndSelect('o.payments', 'payment')
      .where('o.type = :type', { type: OrderTypeEnum.DELIVERY })
      .andWhere('(o.delivery_status IN (:...open) OR o."createdAt" >= :from)', {
        open: OPEN,
        from,
      })
      .orderBy('o."createdAt"', 'DESC');

    if (company) query.andWhere('o.company_id = :company', { company });
    if (!hasPermission(user, 'deliveries.manage'))
      query.andWhere(
        isRider(user)
          ? `(o.user_id = :me OR o.rider_id = :me OR (o.rider_id IS NULL AND o.outside_rider IS NULL AND o.delivery_status = :waiting AND o.status != :cancelled))`
          : '(o.user_id = :me OR o.rider_id = :me)',
        {
          me: user.sub,
          waiting: DeliveryStatusEnum.WAITING,
          cancelled: OrderStatusEnum.CANCELLED,
        },
      );

    return query.getMany();
  }

  // Workers who can carry deliveries, to pick from.
  async riders(user: Payload) {
    this.assertCanUse(user);
    const users = await this.dataSource.getRepository(User).find({
      where: {
        company: { id: targetCompanyId(user) },
        role: UserRole.EMPLOYEE,
        active: true,
      },
      relations: { employee: { role: true } },
    });
    return users
      .filter((u) => u.employee && canRide(u.employee.permissions))
      .map((u) => ({
        id: u.id,
        name: u.employee?.name ?? u.name,
        phone: u.employee?.phone ?? u.phone,
      }));
  }

  // On the road. A paid-now order must be paid first. Leaving out who takes it
  // keeps whoever was set (or nobody).
  async send(user: Payload, id: string, dto: SendDeliveryDto) {
    const order = await this.getForAction(user, id);

    if (order.deliveryStatus !== DeliveryStatusEnum.WAITING)
      throw new BadRequestException('This delivery was already sent');
    if (order.status === OrderStatusEnum.CANCELLED)
      throw new BadRequestException('This order was cancelled');
    if (!order.payOnDelivery && order.status !== OrderStatusEnum.COMPLETED)
      throw new BadRequestException('Take the payment before sending it');

    if (dto.riderId) {
      await this.assertRider(
        this.dataSource.manager,
        order.company.id,
        dto.riderId,
      );
      order.rider = { id: dto.riderId } as User;
      order.outsideRider = null;
    } else if (dto.outsideRider) {
      order.rider = null;
      order.outsideRider = dto.outsideRider;
    }
    // Who takes it is optional: many shops send it with whoever is free and
    // write it down later, or not at all.

    order.deliveryStatus = DeliveryStatusEnum.ON_THE_WAY;
    order.sentAt = new Date();
    return this.saveAndShow(order);
  }

  // A rider takes a waiting delivery nobody has. Only one rider gets it when two
  // tap at the same time.
  async take(user: Payload, id: string) {
    if (!isRider(user))
      throw new ForbiddenException('Only riders can take deliveries');
    const company = targetCompanyId(user);

    const { affected } = await this.orderRepo
      .createQueryBuilder()
      .update(Order)
      .set({ rider: { id: user.sub } })
      .where('id = :id', { id })
      .andWhere('company_id = :company', { company })
      .andWhere('type = :type', { type: OrderTypeEnum.DELIVERY })
      .andWhere('delivery_status = :waiting', {
        waiting: DeliveryStatusEnum.WAITING,
      })
      .andWhere('status != :cancelled', {
        cancelled: OrderStatusEnum.CANCELLED,
      })
      .andWhere('rider_id IS NULL AND outside_rider IS NULL')
      .execute();

    if (!affected)
      throw new BadRequestException('Another rider already took this delivery');
    return this.show(id);
  }

  // A rider gives back a delivery they took but haven't left with.
  async giveBack(user: Payload, id: string) {
    const order = await this.getForAction(user, id);
    if (order.rider?.id !== user.sub)
      throw new BadRequestException('This delivery is not yours');
    if (order.deliveryStatus !== DeliveryStatusEnum.WAITING)
      throw new BadRequestException('You already left with this delivery');

    order.rider = null;
    return this.saveAndShow(order);
  }

  // The customer has it, straight from waiting or after being sent. Money taken
  // at the door is recorded here and counts as the money of whoever took it;
  // who carried it can be written down now too.
  async delivered(user: Payload, id: string, dto: DeliveredDto) {
    const order = await this.getForAction(user, id);

    if (!OPEN.includes(order.deliveryStatus!))
      throw new BadRequestException('This delivery is already finished');
    if (order.status === OrderStatusEnum.CANCELLED)
      throw new BadRequestException('This order was cancelled');

    if (order.status !== OrderStatusEnum.COMPLETED) {
      const payments = dto.payments ?? [];
      if (!payments.length)
        throw new BadRequestException('Enter the money received at the door');
      const paid = payments.reduce((sum, p) => sum + toCents(p.amount), 0);
      if (paid !== toCents(order.total))
        throw new BadRequestException(
          `The customer must pay ${Number(order.total).toLocaleString()} RWF`,
        );
      // Not limited to the worker's own orders: the rider didn't make it.
      await this.orders.completeOrder(user, id, { payments }, {});
      order.collectedBy = { id: user.sub } as User;
    }

    if (dto.riderId)
      await this.assertRider(
        this.dataSource.manager,
        order.company.id,
        dto.riderId,
      );

    await this.orderRepo.update(id, {
      deliveryStatus: DeliveryStatusEnum.DELIVERED,
      deliveredAt: new Date(),
      // Off the kitchen screen: the customer has it.
      kitchenStatus: null,
      ...(order.collectedBy ? { collectedBy: { id: user.sub } } : {}),
      ...(dto.riderId
        ? { rider: { id: dto.riderId }, outsideRider: null }
        : dto.outsideRider
          ? { rider: null, outsideRider: dto.outsideRider }
          : {}),
    });
    return this.show(id);
  }

  // Came back. An unpaid order is cancelled (nothing left the stock); a paid one
  // stays paid, so the money can be given back.
  async notDelivered(user: Payload, id: string, dto: NotDeliveredDto) {
    const order = await this.getForAction(user, id);

    if (!OPEN.includes(order.deliveryStatus!))
      throw new BadRequestException('This delivery is already finished');

    order.deliveryStatus = DeliveryStatusEnum.NOT_DELIVERED;
    order.deliveryProblem = dto.reason;
    order.kitchenStatus = null;
    if (order.status !== OrderStatusEnum.COMPLETED)
      order.status = OrderStatusEnum.CANCELLED;
    return this.saveAndShow(order);
  }

  async saveSettings(user: Payload, dto: DeliverySettingsDto) {
    const companyId = targetCompanyId(user);
    const seen = new Set<string>();
    const areas = dto.areas.filter((a) => {
      const key = a.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    await this.dataSource.getRepository(Company).update(companyId, {
      deliveryEnabled: dto.enabled,
      deliveryFee: dto.fee,
      deliveryAreas: areas,
      deliveryRiders: dto.riders,
    });
    const riderRole =
      dto.enabled && dto.riders
        ? await ensureReadyRole(
            this.dataSource.manager,
            companyId,
            READY_ROLES.rider,
          )
        : null;
    return {
      enabled: dto.enabled,
      fee: dto.fee,
      areas,
      riders: dto.riders,
      riderRole,
    };
  }

  // ---- helpers ----

  private assertCanUse(user: Payload) {
    if (
      !['sales.create', 'deliveries.ride', 'deliveries.manage'].some((key) =>
        hasPermission(user, key),
      )
    )
      throw new ForbiddenException('Your role does not allow this');
  }

  private async assertRider(
    manager: EntityManager,
    companyId: string,
    riderId: string,
  ) {
    const rider = await manager.findOne(User, {
      where: {
        id: riderId,
        company: { id: companyId },
        role: UserRole.EMPLOYEE,
        active: true,
      },
      relations: { employee: { role: true } },
    });
    if (!rider?.employee || !canRide(rider.employee.permissions))
      throw new BadRequestException('That worker is not a rider');
  }

  // A delivery the user may move along: managers any, others their own or the
  // ones they carry.
  private async getForAction(user: Payload, id: string) {
    this.assertCanUse(user);
    const order = await this.orderRepo.findOne({
      where: {
        id,
        type: OrderTypeEnum.DELIVERY,
        ...(scopeCompanyId(user)
          ? { company: { id: scopeCompanyId(user) } }
          : {}),
      },
      relations: { company: true, user: true, rider: true },
    });

    const mine =
      order &&
      (hasPermission(user, 'deliveries.manage') ||
        order.user?.id === user.sub ||
        order.rider?.id === user.sub);
    if (!order || !mine) throw new NotFoundException('Delivery not found');

    return order;
  }

  private async saveAndShow(order: Order) {
    await this.orderRepo.save(order);
    return this.show(order.id);
  }

  private async show(id: string) {
    const order = await this.orderRepo.findOneOrFail({
      where: { id },
      relations: {
        items: { product: { images: true } },
        user: { employee: true },
        rider: { employee: true },
        collectedBy: true,
        payments: true,
        company: true,
      },
    });
    this.realtime.orderUpdated(order);
    return order;
  }
}

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
