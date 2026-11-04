import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CreateCompanyDto } from './dto/request/create-company.dto';
import { UpdateCompanyDto } from './dto/request/update-company.dto';
import { DeviceActivity } from '../device/entities/device-activity.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { Order, OrderStatusEnum } from '../order/entities/order.entity';
import { FileService } from '../file/file.service';
import { ensureReadyRole, READY_ROLES } from '../employee/ready-roles';
import { RealtimeService } from '../realtime/realtime.service';
import { User } from '../user/entities/user.entity';
import {
  DEVICE_ONLINE_WINDOW_MS,
  Device,
  RegistrationStatusEnum,
} from '../device/entities/device.entity';
import { CompanyFeatures, FEATURES, featuresOf } from './features';
import { SubscriptionPayment } from './entities/subscription-payment.entity';
import {
  InboxItem,
  InboxStatusEnum,
} from '../inbox/entities/inbox-item.entity';
import { billingStatus, lay, toDay } from './billing';
import { RecordPaymentDto, SetPlanDto } from './dto/request/billing.dto';
import { Payload } from 'src/util/token.service';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly repo: Repository<Company>,

    @InjectRepository(DeviceActivity)
    private readonly activityRepo: Repository<DeviceActivity>,

    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,

    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,

    private readonly fileService: FileService,

    @InjectRepository(SubscriptionPayment)
    private readonly paymentRepo: Repository<SubscriptionPayment>,

    private readonly realtime: RealtimeService,
  ) {}

  async create(dto: CreateCompanyDto) {
    const company = this.repo.create(dto);
    return this.repo.save(company);
  }

  async findAll() {
    return this.repo.find({
      order: { createdAt: 'DESC' },
    });
  }

  // The super admin's dashboard: totals across every company, each company's
  // numbers, and paid sales per day for the last 30 days.
  async platformOverview() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const from = new Date(today.getTime() - 29 * 86_400_000);
    const onlineSince = new Date(now.getTime() - DEVICE_ONLINE_WINDOW_MS);
    const paid = OrderStatusEnum.COMPLETED;
    const num = (v: unknown) => Number(v ?? 0);

    const [
      companies,
      perCompany,
      byDay,
      lastMonth,
      users,
      devices,
      collected,
      newRequests,
    ] = await Promise.all([
      this.repo.find({ order: { createdAt: 'DESC' } }),
      this.orderRepo
        .createQueryBuilder('o')
        .select('o.company_id', 'companyId')
        .addSelect(
          `COALESCE(SUM(o.total) FILTER (WHERE o.status = :paid AND o."createdAt" >= :today), 0)`,
          'salesToday',
        )
        .addSelect(
          `COUNT(*) FILTER (WHERE o."createdAt" >= :today)`,
          'ordersToday',
        )
        .addSelect(
          `COALESCE(SUM(o.total) FILTER (WHERE o.status = :paid AND o."createdAt" >= :month), 0)`,
          'salesMonth',
        )
        .addSelect(
          `COUNT(*) FILTER (WHERE o.status = :paid AND o."createdAt" >= :month)`,
          'ordersMonth',
        )
        .addSelect('MAX(o."createdAt")', 'lastOrderAt')
        .setParameters({ paid, today, month: monthStart })
        .groupBy('o.company_id')
        .getRawMany<Record<string, string>>(),
      this.orderRepo
        .createQueryBuilder('o')
        .select(`to_char(o."createdAt", 'YYYY-MM-DD')`, 'day')
        .addSelect('COALESCE(SUM(o.total), 0)', 'total')
        .addSelect('COUNT(*)', 'orders')
        .where('o.status = :paid', { paid })
        .andWhere('o."createdAt" >= :from', { from })
        .groupBy('day')
        .orderBy('day')
        .getRawMany<{ day: string; total: string; orders: string }>(),
      this.orderRepo
        .createQueryBuilder('o')
        .select('COALESCE(SUM(o.total), 0)', 'total')
        .where('o.status = :paid', { paid })
        .andWhere('o."createdAt" >= :a AND o."createdAt" < :b', {
          a: lastMonthStart,
          b: monthStart,
        })
        .getRawOne<{ total: string }>(),
      this.repo.manager
        .getRepository(User)
        .createQueryBuilder('u')
        .select('u.company_id', 'companyId')
        .addSelect('COUNT(*)', 'users')
        .addSelect('COUNT(*) FILTER (WHERE u.active = true)', 'activeUsers')
        .groupBy('u.company_id')
        .getRawMany<Record<string, string>>(),
      this.repo.manager
        .getRepository(Device)
        .createQueryBuilder('d')
        .select('d.company_id', 'companyId')
        .addSelect('COUNT(*)', 'devices')
        .addSelect(
          `COUNT(*) FILTER (WHERE d.last_seen_at >= :since AND d.registration_status = :ok)`,
          'online',
        )
        .addSelect(
          `COUNT(*) FILTER (WHERE d.registration_status IN (:...waiting))`,
          'waiting',
        )
        .setParameters({
          since: onlineSince,
          ok: RegistrationStatusEnum.REGISTERED,
          waiting: [
            RegistrationStatusEnum.PENDING,
            RegistrationStatusEnum.REQUESTED,
          ],
        })
        .groupBy('d.company_id')
        .getRawMany<Record<string, string>>(),
      this.paymentRepo
        .createQueryBuilder('p')
        .select('COALESCE(SUM(p.amount), 0)', 'total')
        .where('p.paid_on >= :from', { from: toDay(monthStart) })
        .getRawOne<{ total: string }>(),
      this.repo.manager
        .getRepository(InboxItem)
        .count({ where: { status: InboxStatusEnum.NEW } }),
    ]);

    const index = (rows: Record<string, string>[]) =>
      new Map(rows.map((r) => [r.companyId, r]));
    const sales = index(perCompany);
    const people = index(users);
    const machines = index(devices);

    const rows = companies.map((c) => {
      const s = sales.get(c.id);
      const u = people.get(c.id);
      const d = machines.get(c.id);
      return {
        id: c.id,
        name: c.name,
        code: c.code,
        logo: c.logo,
        type: c.type,
        location: c.location,
        createdAt: c.createdAt,
        active: c.active !== false,
        plan: c.plan,
        monthlyPrice: num(c.monthlyPrice),
        paidUntil: c.paidUntil,
        billing: billingStatus(c.plan, c.paidUntil),
        salesToday: num(s?.salesToday),
        ordersToday: num(s?.ordersToday),
        salesMonth: num(s?.salesMonth),
        ordersMonth: num(s?.ordersMonth),
        lastOrderAt: s?.lastOrderAt ?? null,
        users: num(u?.users),
        activeUsers: num(u?.activeUsers),
        devices: num(d?.devices),
        onlineDevices: num(d?.online),
        waitingDevices: num(d?.waiting),
      };
    });
    const sum = (key: keyof (typeof rows)[number]) =>
      rows.reduce((t, r) => t + num(r[key]), 0);

    return {
      totals: {
        companies: rows.length,
        activeCompanies: rows.filter((r) => r.active).length,
        newThisMonth: rows.filter((r) => new Date(r.createdAt) >= monthStart)
          .length,
        salesToday: sum('salesToday'),
        ordersToday: sum('ordersToday'),
        salesMonth: sum('salesMonth'),
        salesLastMonth: num(lastMonth?.total),
        users: sum('users'),
        activeUsers: sum('activeUsers'),
        devices: sum('devices'),
        onlineDevices: sum('onlineDevices'),
        waitingDevices: sum('waitingDevices'),
        monthlyRevenue: rows
          .filter((r) => r.active && r.plan && r.plan !== 'TRIAL')
          .reduce((t, r) => t + r.monthlyPrice, 0),
        collectedThisMonth: num(collected?.total),
        overdue: rows.filter((r) => r.active && r.billing === 'OVERDUE').length,
        dueSoon: rows.filter((r) => r.active && r.billing === 'DUE_SOON')
          .length,
        newRequests,
      },
      salesByDay: byDay.map((d) => ({
        day: d.day,
        total: num(d.total),
        orders: num(d.orders),
      })),
      companies: rows,
    };
  }

  // ---- Subscription ----

  async billing(companyId: string) {
    const company = await this.getOne({ id: companyId });
    const payments = await this.paymentRepo.find({
      where: { company: { id: companyId } },
      order: { paidOn: 'DESC', createdAt: 'DESC' },
    });
    return {
      plan: company.plan,
      monthlyPrice: Number(company.monthlyPrice ?? 0),
      paidUntil: company.paidUntil,
      trialEnds: company.trialEnds,
      note: company.billingNote,
      status: billingStatus(company.plan, company.paidUntil),
      totalPaid: payments.reduce((t, p) => t + Number(p.amount), 0),
      payments: payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        months: p.months,
        method: p.method,
        paidOn: p.paidOn,
        coversFrom: p.coversFrom,
        coversTo: p.coversTo,
        note: p.note,
        recordedByName: p.recordedByName,
        createdAt: p.createdAt,
      })),
    };
  }

  async setPlan(companyId: string, dto: SetPlanDto) {
    const company = await this.getOne({ id: companyId });
    company.plan = dto.plan;
    company.monthlyPrice = String(dto.monthlyPrice);
    if (dto.note !== undefined) company.billingNote = dto.note.trim() || null;
    if (dto.plan === 'TRIAL')
      company.trialEnds =
        dto.trialEnds?.slice(0, 10) ??
        company.trialEnds ??
        toDay(new Date(Date.now() + 14 * 86_400_000));
    await this.repo.save(company);
    await this.relay(companyId);
    return this.billing(companyId);
  }

  async addPayment(user: Payload, companyId: string, dto: RecordPaymentDto) {
    const company = await this.getOne({ id: companyId });
    if (!company.plan)
      throw new ForbiddenException('Choose a plan for this company first');
    const day = dto.paidOn.slice(0, 10);
    await this.paymentRepo.save(
      this.paymentRepo.create({
        company: { id: companyId },
        amount: String(dto.amount),
        months: dto.months,
        method: dto.method,
        paidOn: day,
        coversFrom: day,
        coversTo: day,
        note: dto.note?.trim() || null,
        recordedByName: user.name ?? user.email,
      }),
    );
    await this.relay(companyId);
    return this.billing(companyId);
  }

  async removePayment(companyId: string, paymentId: string) {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId, company: { id: companyId } },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    await this.paymentRepo.remove(payment);
    await this.relay(companyId);
    return this.billing(companyId);
  }

  // Works out again which days each payment covers and the last day paid for.
  private async relay(companyId: string) {
    const company = await this.getOne({ id: companyId });
    const payments = await this.paymentRepo.find({
      where: { company: { id: companyId } },
    });
    const { laid, paidUntil } = lay(payments, company.trialEnds);
    for (const { payment, coversFrom, coversTo } of laid) {
      if (payment.coversFrom !== coversFrom || payment.coversTo !== coversTo) {
        payment.coversFrom = coversFrom;
        payment.coversTo = coversTo;
        await this.paymentRepo.save(payment);
      }
    }
    await this.repo.update(companyId, { paidUntil });
  }

  async getOne(where: FindOptionsWhere<Company>) {
    const company = await this.findOne(where);

    if (!company) throw new NotFoundException('Company not found');

    return company;
  }

  // Everything that belongs to a company: users (with last login), devices (with who is
  // using them, online status and last activity), employees, roles, catalogue, floor
  // maps, order totals, the most recent device activity and the recent change history.
  async getDetails(id: string, activityLimit = 30) {
    const company = await this.repo.findOne({
      where: { id },
      relations: {
        users: { employee: true },
        devices: { currentUser: true },
        employees: { role: true, profile: true },
        roles: true,
        floorMaps: { rooms: { roomType: true, seats: true } },
        categories: true,
        products: { category: true },
        roomTypes: true,
      },
      // Load each relation in its own query instead of one huge join.
      relationLoadStrategy: 'query',
    });

    if (!company) throw new NotFoundException('Company not found');

    // Most recently active first (relation ordering isn't supported with the 'query' strategy).
    const newestFirst = (a?: Date | null, b?: Date | null) =>
      (b ? new Date(b).getTime() : 0) - (a ? new Date(a).getTime() : 0);
    company.users.sort((a, b) => newestFirst(a.lastLoginAt, b.lastLoginAt));
    company.devices.sort((a, b) => newestFirst(a.lastSeenAt, b.lastSeenAt));

    const [recentActivity, recentChanges, ordersByStatus] = await Promise.all([
      this.activityRepo.find({
        where: { device: { company: { id } } },
        relations: { device: true, user: true },
        order: { createdAt: 'DESC' },
        take: activityLimit,
      }),
      this.auditRepo.find({
        where: { companyId: id },
        order: { createdAt: 'DESC' },
        take: activityLimit,
      }),
      this.orderRepo
        .createQueryBuilder('order')
        .select('order.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .addSelect('COALESCE(SUM(order.total), 0)', 'total')
        .where('order.company_id = :id', { id })
        .groupBy('order.status')
        .getRawMany<{
          status: OrderStatusEnum;
          count: string;
          total: string;
        }>(),
    ]);

    const orders = Object.fromEntries(
      ordersByStatus.map((o) => [
        o.status,
        { count: Number(o.count), total: Number(o.total) },
      ]),
    );

    return {
      ...company,
      stats: {
        users: company.users.length,
        activeUsers: company.users.filter((u) => u.active).length,
        employees: company.employees.length,
        devices: company.devices.length,
        onlineDevices: company.devices.filter((d) => d.online).length,
        devicesInUse: company.devices.filter((d) => d.online && d.currentUser)
          .length,
        categories: company.categories.length,
        products: company.products.length,
        activeProducts: company.products.filter((p) => p.active).length,
        floorMaps: company.floorMaps.length,
        orders,
      },
      recentActivity: recentActivity.map(({ device, user, ...activity }) => ({
        ...activity,
        device: { id: device.id, deviceName: device.deviceName },
        user: user ? { id: user.id, name: user.name, role: user.role } : null,
      })),
      recentChanges,
    };
  }

  async findOne(where: FindOptionsWhere<Company>) {
    return await this.repo.findOne({ where });
  }

  async update(id: string, dto: UpdateCompanyDto, logo?: Express.Multer.File) {
    const company = await this.getOne({ id });
    const { logo: _logo, ...fields } = dto;
    const oldLogo = company.logo;

    Object.assign(company, fields);

    if (logo)
      company.logo = await this.fileService.uploadImage(
        logo,
        'f_auto,q_auto,c_limit,w_600',
      );

    try {
      await this.repo.save(company);
    } catch (error) {
      if (logo) await this.fileService.deleteByUrl(company.logo);
      throw error;
    }

    if (logo) await this.fileService.deleteByUrl(oldLogo);

    return company;
  }

  // Switching an extra off also turns off the owner's own setting for it, so the
  // till stops offering it; everyone signed in picks up the change at once.
  async setFeatures(id: string, changes: Partial<CompanyFeatures>) {
    const company = await this.getOne({ id });
    const features = { ...featuresOf(company.features) };
    for (const key of Object.keys(FEATURES) as (keyof CompanyFeatures)[])
      if (typeof changes[key] === 'boolean') features[key] = changes[key];

    await this.repo.update(id, {
      features,
      ...(features.delivery
        ? {}
        : { deliveryEnabled: false, deliveryRiders: false }),
      ...(features.kitchen ? {} : { kitchenEnabled: false }),
    });

    const users = await this.repo.manager.getRepository(User).find({
      where: { company: { id } },
      select: { id: true },
    });
    await this.realtime.usersChanged(users.map((u) => u.id));
    return { id, features };
  }

  // Terminating signs everyone in the company out at once (the guard refuses their
  // next request, and the realtime event makes open apps check now); activating
  // lets them sign in again. Nothing is deleted.
  async setStatus(id: string, active: boolean, reason?: string) {
    await this.getOne({ id });
    await this.repo.update(id, {
      active,
      suspendedAt: active ? null : new Date(),
      suspendedReason: active ? null : reason?.trim() || null,
    });

    const users = await this.repo.manager.getRepository(User).find({
      where: { company: { id } },
      select: { id: true },
    });
    await this.realtime.usersChanged(users.map((u) => u.id));
    return this.repo.findOne({
      where: { id },
      select: {
        id: true,
        active: true,
        suspendedAt: true,
        suspendedReason: true,
      },
    });
  }

  // Turning the kitchen screen on also makes a "Kitchen staff" role, ready to give.
  async saveKitchen(id: string, enabled: boolean) {
    const company = await this.getOne({ id });
    if (enabled && !featuresOf(company.features).kitchen)
      throw new ForbiddenException(
        `${FEATURES.kitchen} is not turned on for your company. Contact SmartPOS to add it`,
      );
    await this.repo.update(id, { kitchenEnabled: enabled });
    const kitchenRole = enabled
      ? await ensureReadyRole(this.repo.manager, id, READY_ROLES.kitchen)
      : null;
    return { enabled, kitchenRole };
  }

  async remove(id: string) {
    const company = await this.getOne({ id });
    const logo = company.logo;

    const removed = await this.repo.remove(company);
    await this.fileService.deleteByUrl(logo);

    return removed;
  }
}
