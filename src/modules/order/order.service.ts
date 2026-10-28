import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Payment, PaymentMethodEnum } from './entities/payment.entity';
import { CreateOrderDto } from './dto/request/create-order.dto';
import { CompleteOrderDto } from './dto/request/complete-order.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Order, OrderStatusEnum } from './entities/order.entity';
import {
  DataSource,
  EntityManager,
  FindOptionsWhere,
  In,
  Repository,
} from 'typeorm';
import { Payload } from 'src/util/token.service';
import {
  companyWhere,
  ownRecordsWhere,
  scopeCompanyId,
} from 'src/common/utils/company-scope';
import { User, UserRole } from '../user/entities/user.entity';
import { RealtimeService } from '../realtime/realtime.service';
import {
  hasPermission,
  requirePermission,
} from 'src/common/permissions/permissions';

const toCents = (amount: number) => Math.round(Number(amount) * 100);

function assertOpen(order: Order) {
  if (
    order.status === OrderStatusEnum.COMPLETED ||
    order.status === OrderStatusEnum.CANCELLED
  )
    throw new BadRequestException(
      `Order is already ${order.status.toLowerCase()}`,
    );
}

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,

    private readonly dataSource: DataSource,

    private readonly realtime: RealtimeService,
  ) {}

  async createOrder(dto: CreateOrderDto, repo: EntityManager) {
    const order = repo.create(Order, {
      status: OrderStatusEnum.PENDING,
      subtotal: dto.subtotal,
      tax: dto.tax,
      total: dto.subtotal + dto.tax,
      note: dto.note,
      user: dto.user,
      company: { id: dto.companyId },
    });

    return await repo.save(order);
  }

  // Employees see their own orders, owners their company's, super admin everything.
  // With orders.view_all an employee sees the whole company's orders.
  async getOrders(user: Payload, companyId?: string) {
    return this.orderRepo.find({
      where: { ...companyWhere(user, companyId), ...this.viewScope(user) },
      relations: {
        items: { product: { images: true } },
        user: { employee: true },
        company: true,
        payments: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  // Each employee's totals per month of `year`, for the owner's employee-of-the-month
  // page. Summed in the database, so it stays small however many orders there are.
  async getStaffPerformance(user: Payload, year: number, companyId?: string) {
    const company = scopeCompanyId(user, companyId);
    const query = this.orderRepo
      .createQueryBuilder('o')
      .innerJoin('o.user', 'u')
      .select(
        `to_char(date_trunc('month', "o"."createdAt"), 'YYYY-MM')`,
        'month',
      )
      .addSelect('"u"."id"', 'userId')
      .addSelect(
        `COALESCE(SUM("o"."total") FILTER (WHERE "o"."status" = :completed), 0)`,
        'sales',
      )
      .addSelect(`COUNT(*) FILTER (WHERE "o"."status" = :completed)`, 'orders')
      .addSelect(
        `COUNT(*) FILTER (WHERE "o"."status" = :cancelled)`,
        'cancelled',
      )
      .addSelect(
        `COUNT(DISTINCT date_trunc('day', "o"."createdAt"))`,
        'activeDays',
      )
      .where('"o"."createdAt" >= :from AND "o"."createdAt" < :to', {
        from: new Date(Date.UTC(year, 0, 1)),
        to: new Date(Date.UTC(year + 1, 0, 1)),
      })
      .andWhere('"u"."role" = :employee', { employee: UserRole.EMPLOYEE })
      .setParameters({
        completed: OrderStatusEnum.COMPLETED,
        cancelled: OrderStatusEnum.CANCELLED,
      })
      .groupBy('month')
      .addGroupBy('"u"."id"')
      .orderBy('month', 'ASC');
    if (company) query.andWhere('"o"."company_id" = :company', { company });

    const rows = await query.getRawMany<{
      month: string;
      userId: string;
      sales: string;
      orders: string;
      cancelled: string;
      activeDays: string;
    }>();

    const ids = [...new Set(rows.map((r) => r.userId))];
    const users = ids.length
      ? await this.dataSource.getRepository(User).find({
          where: { id: In(ids) },
          relations: { employee: { profile: true, role: true }, avatar: true },
        })
      : [];

    return {
      year,
      staff: users.map((u) => ({
        id: u.id,
        name: u.employee?.name ?? u.name,
        role: u.employee?.role?.name ?? null,
        active: u.active,
        photo: u.employee?.profile ?? u.avatar ?? null,
      })),
      months: rows.map((r) => ({
        month: r.month,
        userId: r.userId,
        sales: Number(r.sales),
        orders: Number(r.orders),
        cancelled: Number(r.cancelled),
        activeDays: Number(r.activeDays),
      })),
    };
  }

  async viewOrder(user: Payload, id: string) {
    return this.getOrder(user, id, this.viewScope(user));
  }

  // Changing an order is limited to the employee's own orders, whatever they can see.
  async getOrder(
    user: Payload,
    id: string,
    scope: FindOptionsWhere<Order> = ownRecordsWhere(user),
  ) {
    const order = await this.orderRepo.findOne({
      where: { id, ...companyWhere(user), ...scope },
      relations: {
        items: { product: { images: true } },
        user: { employee: true },
        company: true,
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  // Completing is the only way to reach COMPLETED, because that is where payment is
  // recorded. Completed and cancelled orders are final.
  async changeStatus(user: Payload, id: string, status: OrderStatusEnum) {
    if (status === OrderStatusEnum.COMPLETED)
      throw new BadRequestException(
        'Use the complete endpoint to finish an order with its payments',
      );

    const order = await this.getOrder(user, id);

    assertOpen(order);

    order.status = status;

    return this.saveAndNotify(order);
  }

  async completeOrder(user: Payload, id: string, dto: CompleteOrderDto) {
    if (dto.payments.length > 1) requirePermission(user, 'sales.split_payment');

    if (dto.payments.some((p) => p.method === PaymentMethodEnum.CREDIT))
      requirePermission(user, 'sales.credit');

    const order = await this.getOrder(user, id);

    // Compare in cents so float rounding can't reject a correct split.
    const paid = dto.payments.reduce((sum, p) => sum + toCents(p.amount), 0);

    if (paid !== toCents(order.total))
      throw new BadRequestException(
        `Payments add up to ${paid / 100} but the order total is ${Number(order.total)}`,
      );

    await this.dataSource.transaction(async (manager) => {
      // Lock the order so two simultaneous completions can't both record payments.
      const locked = await manager.findOne(Order, {
        where: { id: order.id },
        lock: { mode: 'pessimistic_write' },
      });

      assertOpen(locked!);

      // Only order.id is persisted; the company is carried along for the audit log.
      const orderRef = { id: order.id, company: order.company } as Order;

      await manager.save(
        dto.payments.map(({ method, amount, ...credit }) =>
          manager.create(Payment, {
            order: orderRef,
            method,
            amount,
            ...(method === PaymentMethodEnum.CREDIT
              ? credit
              : {
                  creditOwnerName: null,
                  creditOwnerPhone: null,
                  takenBy: null,
                }),
          }),
        ),
      );

      // Saved without loaded relations: re-saving `order` (whose payments list is
      // still empty) would unlink the payments just added.
      locked!.status = OrderStatusEnum.COMPLETED;
      locked!.company = order.company;
      await manager.save(Order, locked!);
    });

    const completed = await this.getOrder(user, id);
    this.realtime.orderUpdated(completed);

    return completed;
  }

  async cancelOrder(user: Payload, id: string) {
    const order = await this.getOrder(user, id);

    assertOpen(order);

    order.status = OrderStatusEnum.CANCELLED;

    return this.saveAndNotify(order);
  }

  private async saveAndNotify(order: Order) {
    const saved = await this.orderRepo.save(order);
    this.realtime.orderUpdated(saved);
    return saved;
  }

  private viewScope(user: Payload): FindOptionsWhere<Order> {
    return hasPermission(user, 'orders.view_all') ? {} : ownRecordsWhere(user);
  }
}
