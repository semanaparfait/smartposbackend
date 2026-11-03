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
      customerPhone: dto.customerPhone,
      deliveryAddress: dto.address,
      deliveryArea: area,
      payOnDelivery: dto.payOnDelivery,
      rider: dto.riderId ? ({ id: dto.riderId } as User) : null,
      outsideRider: dto.riderId ? null : dto.outsideRider || null,
      note: dto.note || undefined,
    };
  }

  // Deliveries still on their way or waiting, plus those since `since`.
  // Managers see all; others the ones they made or carry.
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
      query.andWhere('(o.user_id = :me OR o.rider_id = :me)', { me: user.sub });

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

  // On the road. A paid-now order must be paid first.
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
    } else if (!order.rider && !order.outsideRider) {
      // A rider sending it out takes it themselves.
      if (!hasPermission(user, 'deliveries.ride'))
        throw new BadRequestException('Choose who takes it');
      order.rider = { id: user.sub } as User;
    }

    order.deliveryStatus = DeliveryStatusEnum.ON_THE_WAY;
    order.sentAt = new Date();
    return this.saveAndShow(order);
  }

  // The customer has it. Money taken at the door is recorded here, and counts
  // as the money of whoever took it.
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

    await this.orderRepo.update(id, {
      deliveryStatus: DeliveryStatusEnum.DELIVERED,
      deliveredAt: new Date(),
      ...(order.collectedBy ? { collectedBy: { id: user.sub } } : {}),
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
    });
    return { enabled: dto.enabled, fee: dto.fee, areas };
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
