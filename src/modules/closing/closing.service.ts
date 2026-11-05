import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  In,
  LessThan,
  MoreThanOrEqual,
  Not,
  Repository,
} from 'typeorm';
import { Payload } from 'src/util/token.service';
import { companyWhere, targetCompanyId } from 'src/common/utils/company-scope';
import { Order, OrderStatusEnum } from '../order/entities/order.entity';
import { Payment } from '../order/entities/payment.entity';
import { Product } from '../product/entities/product.entity';
import {
  StockMovement,
  StockMovementReasonEnum,
} from '../product/entities/stock-movement.entity';
import { BookingPayment } from '../service/entities/booking-payment.entity';
import { Expense } from '../expense/entities/expense.entity';
import {
  MoneyCheck,
  MoneyCheckStatusEnum,
} from '../money-check/entities/money-check.entity';
import { User } from '../user/entities/user.entity';
import { StockService } from '../product/stock.service';
import { PushService } from '../notifications/push.service';
import {
  ClosingMoney,
  ClosingStockRow,
  DayClosing,
  Method,
  MoneyByMethod,
} from './day-closing.entity';
import { CloseDayDto } from './closing.dto';

// Rwanda is UTC+2 all year.
const KIGALI_MS = 2 * 60 * 60 * 1000;
const kigaliDay = (d: Date) =>
  new Date(d.getTime() + KIGALI_MS).toISOString().slice(0, 10);
const startOfKigaliDay = (d: Date) =>
  new Date(new Date(`${kigaliDay(d)}T00:00:00Z`).getTime() - KIGALI_MS);

const num = (v: unknown) => Number(v ?? 0) || 0;
const round = (v: number) => Math.round(v * 1000) / 1000;
const rwf = (v: number) => `${Math.round(v).toLocaleString('en-US')} RWF`;
const emptyMoney = (): MoneyByMethod => ({
  CASH: 0,
  MOMO: 0,
  CARD: 0,
  CREDIT: 0,
});
const isMethod = (m: string): m is Method =>
  m === 'CASH' || m === 'MOMO' || m === 'CARD' || m === 'CREDIT';

@Injectable()
export class ClosingService {
  constructor(
    @InjectRepository(DayClosing)
    private readonly repo: Repository<DayClosing>,
    private readonly dataSource: DataSource,
    private readonly stock: StockService,
    private readonly push: PushService,
  ) {}

  list(user: Payload, companyId?: string) {
    return this.repo.find({
      where: companyWhere(user, companyId),
      order: { closedAt: 'DESC' },
      take: 60,
    });
  }

  async one(user: Payload, id: string) {
    const row = await this.repo.findOne({
      where: { id, ...companyWhere(user) },
    });
    if (!row) throw new NotFoundException('Closing not found');
    return row;
  }

  // Everything the closing screen shows before anyone counts: today's open
  // orders (a reminder, they don't block), the money each method should hold,
  // and each product's stock.
  async preview(user: Payload) {
    const companyId = targetCompanyId(user);
    return this.build(companyId, new Date());
  }

  async close(user: Payload, dto: CloseDayDto) {
    const companyId = targetCompanyId(user);
    const now = new Date();
    const view = await this.build(companyId, now);

    // One closing per day, so nothing is counted twice.
    if (view.alreadyClosed)
      throw new ConflictException(
        `Today was already closed by ${view.alreadyClosed.closedByName}.`,
      );

    const counts = new Map(dto.stock.map((s) => [s.productId, s.counted]));
    const stockRows: ClosingStockRow[] = view.stock.map((row) => {
      const counted = counts.has(row.productId)
        ? round(num(counts.get(row.productId)))
        : null;
      const difference = counted === null ? 0 : round(counted - row.expected);
      const { buyingPrice, ...rest } = row;
      return {
        ...rest,
        counted,
        difference,
        value: difference * buyingPrice,
      };
    });

    const counted = {
      CASH: num(dto.counted.CASH),
      MOMO: num(dto.counted.MOMO),
      CARD: num(dto.counted.CARD),
    };
    const money: ClosingMoney = {
      ...view.money,
      counted,
      difference:
        counted.CASH +
        counted.MOMO +
        counted.CARD -
        (view.money.expected.CASH +
          view.money.expected.MOMO +
          view.money.expected.CARD),
    };

    // Money that doesn't match needs an explanation for the owners.
    if (Math.round(money.difference) !== 0 && !dto.note?.trim())
      throw new BadRequestException(
        money.difference < 0
          ? `${rwf(-money.difference)} is missing. Write a note saying why before closing.`
          : `There is ${rwf(money.difference)} more than expected. Write a note saying why before closing.`,
      );

    const closer = await this.dataSource.getRepository(User).findOne({
      where: { id: user.sub },
      relations: { employee: true },
    });
    const closedByName =
      closer?.employee?.name ?? closer?.name ?? user.name ?? 'Unknown';

    const saved = await this.dataSource.transaction(async (manager) => {
      // The count becomes the stock: tomorrow opens with what is really there.
      for (const row of stockRows)
        if (row.counted !== null && row.difference !== 0)
          await this.stock.apply(manager, {
            productId: row.productId,
            change: row.difference,
            reason: StockMovementReasonEnum.ADJUSTMENT,
            note: `Counted at closing (${view.businessDay})`,
            userId: user.sub,
          });

      return manager.getRepository(DayClosing).save(
        manager.getRepository(DayClosing).create({
          company: { id: companyId },
          businessDay: view.businessDay,
          openedAt: view.from,
          closedAt: now,
          closedById: user.sub,
          closedByName,
          money,
          orders: view.orders,
          stock: stockRows,
          note: dto.note?.trim() || null,
        }),
      );
    });

    void this.tellOwners(companyId, saved);
    return saved;
  }

  // ---- The summary owners get ----

  private async tellOwners(companyId: string, c: DayClosing) {
    const counted = c.stock.filter((s) => s.counted !== null);
    const off = counted.filter((s) => s.difference !== 0);
    const stockLine = !counted.length
      ? 'not counted'
      : off.length
        ? `${off.length} of ${counted.length} products off (${off
            .slice(0, 3)
            .map(
              (s) => `${s.name} ${s.difference > 0 ? '+' : ''}${s.difference}`,
            )
            .join(', ')}${off.length > 3 ? ', ...' : ''})`
        : `all ${counted.length} products match`;
    const moneyLine =
      Math.round(c.money.difference) === 0
        ? `matches, ${rwf(c.money.counted.CASH)} cash counted`
        : c.money.difference < 0
          ? `${rwf(-c.money.difference)} missing`
          : `${rwf(c.money.difference)} more than expected`;
    const sales = rwf(c.orders.paidTotal);
    const day = new Date(`${c.businessDay}T12:00:00Z`).toLocaleDateString(
      'en-GB',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      },
    );

    const stillOpen = c.orders.open
      ? ` · ${c.orders.open} order${c.orders.open === 1 ? '' : 's'} not paid yet`
      : '';
    await this.push.notifyCompany(companyId, undefined, {
      title: `Day closed: ${sales} in sales`,
      body: `${day} · Money ${moneyLine} · Stock ${stockLine}${stillOpen}. Closed by ${c.closedByName}.${c.note ? ` Note: ${c.note}` : ''}`,
      screen: 'day-closing',
      data: { closingId: c.id },
    });
    await this.push.whatsappOwners(companyId, 'smartpos_day_summary', [
      day,
      c.orders.open
        ? `${sales} (${c.orders.open} order${c.orders.open === 1 ? '' : 's'} not paid yet)`
        : sales,
      String(c.orders.paid),
      c.note ? `${moneyLine} (note: ${c.note})` : moneyLine,
      stockLine,
      c.closedByName,
    ]);
  }

  // ---- Working it out ----

  private async build(companyId: string, now: Date) {
    // The day itself: from midnight (Kigali) until now.
    const from = startOfKigaliDay(now);
    const businessDay = kigaliDay(now);
    const closedToday = await this.repo.findOne({
      where: { company: { id: companyId }, businessDay },
      order: { closedAt: 'DESC' },
    });
    const m = this.dataSource.manager;

    const [
      openOrders,
      payments,
      bookingMoney,
      tillExpenses,
      checks,
      products,
      moves,
    ] = await Promise.all([
      // Orders taken today and not paid yet (e.g. a customer paying later).
      m.getRepository(Order).find({
        where: {
          company: { id: companyId },
          status: Not(
            In([OrderStatusEnum.COMPLETED, OrderStatusEnum.CANCELLED]),
          ),
          createdAt: MoreThanOrEqual(from),
        },
        relations: { user: { employee: true } },
        order: { createdAt: 'ASC' },
        take: 200,
      }),
      m
        .getRepository(Payment)
        .createQueryBuilder('p')
        .innerJoin('p.order', 'o')
        .select('p.method', 'method')
        .addSelect('COALESCE(SUM(p.amount), 0)', 'total')
        .where('o.company_id = :companyId', { companyId })
        .andWhere('o.status = :done', { done: OrderStatusEnum.COMPLETED })
        .andWhere('p."createdAt" >= :from AND p."createdAt" < :now', {
          from,
          now,
        })
        .groupBy('p.method')
        .getRawMany<{ method: string; total: string }>(),
      m
        .getRepository(BookingPayment)
        .createQueryBuilder('bp')
        .innerJoin('bp.booking', 'b')
        .select('bp.method', 'method')
        .addSelect(
          `COALESCE(SUM(CASE WHEN bp.is_refund THEN -bp.amount ELSE bp.amount END), 0)`,
          'total',
        )
        .where('b.company_id = :companyId', { companyId })
        .andWhere('bp."createdAt" >= :from AND bp."createdAt" < :now', {
          from,
          now,
        })
        .groupBy('bp.method')
        .getRawMany<{ method: string; total: string }>()
        .catch(() => [] as { method: string; total: string }[]),
      m
        .getRepository(Expense)
        .createQueryBuilder('e')
        .select('COALESCE(SUM(e.amount), 0)', 'total')
        .where('e.company_id = :companyId', { companyId })
        .andWhere(`e.paid_from = 'TILL_CASH'`)
        .andWhere(`e.status != 'REJECTED'`)
        .andWhere('e."createdAt" >= :from AND e."createdAt" < :now', {
          from,
          now,
        })
        .getRawOne<{ total: string }>(),
      m.getRepository(MoneyCheck).find({
        where: { company: { id: companyId }, date: businessDay },
      }),
      m.getRepository(Product).find({
        where: { company: { id: companyId }, trackStock: true },
        order: { name: 'ASC' },
      }),
      m
        .getRepository(StockMovement)
        .createQueryBuilder('mv')
        .innerJoin('mv.product', 'pr')
        .select('pr.id', 'productId')
        .addSelect('mv.reason', 'reason')
        .addSelect('COALESCE(SUM(mv.change), 0)', 'total')
        .where('pr.company_id = :companyId', { companyId })
        .andWhere('mv."createdAt" >= :from', { from })
        .groupBy('pr.id')
        .addGroupBy('mv.reason')
        .getRawMany<{ productId: string; reason: string; total: string }>(),
    ]);

    const cancelledCount = await m
      .getRepository(Order)
      .createQueryBuilder('o')
      .where('o.company_id = :companyId', { companyId })
      .andWhere('o.status = :c', { c: OrderStatusEnum.CANCELLED })
      .andWhere('o."updatedAt" >= :from AND o."updatedAt" < :now', {
        from,
        now,
      })
      .getCount();
    // Orders paid in this stretch (one order may be paid with two methods).
    const paidOrders = await m
      .getRepository(Order)
      .createQueryBuilder('o')
      .innerJoin('o.payments', 'p')
      .where('o.company_id = :companyId', { companyId })
      .andWhere('o.status = :done', { done: OrderStatusEnum.COMPLETED })
      .andWhere('p."createdAt" >= :from AND p."createdAt" < :now', {
        from,
        now,
      })
      .select('COUNT(DISTINCT o.id)', 'count')
      .getRawOne<{ count: string }>()
      .then((r) => num(r?.count));

    const sales = emptyMoney();
    for (const p of payments)
      if (isMethod(p.method)) sales[p.method] += num(p.total);
    const services = emptyMoney();
    for (const p of bookingMoney)
      if (isMethod(p.method)) services[p.method] += num(p.total);
    const tillOut = num(tillExpenses?.total);

    const expected: MoneyByMethod = {
      CASH: sales.CASH + services.CASH - tillOut,
      MOMO: sales.MOMO + services.MOMO,
      CARD: sales.CARD + services.CARD,
      CREDIT: sales.CREDIT,
    };
    const salesTotal = sales.CASH + sales.MOMO + sales.CARD + sales.CREDIT;
    const servicesTotal = services.CASH + services.MOMO + services.CARD;

    // Stock: today's movements per product; opening = now minus what changed.
    const byProduct = new Map<string, Record<string, number>>();
    for (const mv of moves) {
      const row = byProduct.get(mv.productId) ?? {};
      row[mv.reason] = (row[mv.reason] ?? 0) + num(mv.total);
      byProduct.set(mv.productId, row);
    }
    const stock = products.map((p) => {
      const mv = byProduct.get(p.id) ?? {};
      const changed = Object.values(mv).reduce((s, v) => s + v, 0);
      const current = num(p.stockQuantity);
      return {
        productId: p.id,
        name: p.name,
        unit: p.unit,
        buyingPrice: num(p.buyingPrice),
        opening: round(current - changed),
        received: round(mv[StockMovementReasonEnum.RESTOCK] ?? 0),
        sold: round(
          -(
            (mv[StockMovementReasonEnum.SALE] ?? 0) +
            (mv[StockMovementReasonEnum.REFUND] ?? 0)
          ),
        ),
        wasted: round(-(mv[StockMovementReasonEnum.WASTE] ?? 0)),
        adjusted: round(mv[StockMovementReasonEnum.ADJUSTMENT] ?? 0),
        expected: round(current),
        counted: null as number | null,
        difference: 0,
        value: 0,
      };
    });

    return {
      businessDay,
      from,
      to: now,
      alreadyClosed: closedToday
        ? {
            id: closedToday.id,
            closedAt: closedToday.closedAt,
            closedByName: closedToday.closedByName,
          }
        : null,
      // Open orders from before today: not part of this day.
      olderOpenOrders: await m.getRepository(Order).count({
        where: {
          company: { id: companyId },
          status: Not(
            In([OrderStatusEnum.COMPLETED, OrderStatusEnum.CANCELLED]),
          ),
          createdAt: LessThan(from),
        },
      }),
      openOrders: openOrders.map((o) => ({
        id: o.id,
        createdAt: o.createdAt,
        status: o.status,
        total: num(o.total),
        staff: o.user?.employee?.name ?? o.user?.name ?? '—',
        customerName: o.customerName ?? null,
      })),
      money: {
        expected,
        counted: { CASH: 0, MOMO: 0, CARD: 0 },
        difference: 0,
        sales: salesTotal,
        services: servicesTotal,
        tillExpenses: tillOut,
      },
      orders: {
        paid: paidOrders,
        paidTotal: salesTotal,
        cancelled: cancelledCount,
        open: openOrders.length,
      },
      moneyChecks: {
        verified: checks.filter(
          (c) => c.status === MoneyCheckStatusEnum.VERIFIED,
        ).length,
        flagged: checks.filter((c) => c.status === MoneyCheckStatusEnum.FLAGGED)
          .length,
      },
      stock,
    };
  }
}
