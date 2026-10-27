import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CreateCompanyDto } from './dto/request/create-company.dto';
import { UpdateCompanyDto } from './dto/request/update-company.dto';
import { DeviceActivity } from '../device/entities/device-activity.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { Order, OrderStatusEnum } from '../order/entities/order.entity';

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

  async update(id: string, dto: UpdateCompanyDto) {
    const company = await this.getOne({ id });

    Object.assign(company, dto);

    return this.repo.save(company);
  }

  async remove(id: string) {
    const company = await this.getOne({ id });

    return this.repo.remove(company);
  }
}
