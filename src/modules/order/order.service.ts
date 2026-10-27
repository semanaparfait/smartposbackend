import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrderDto } from './dto/request/create-order.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Order, OrderStatusEnum } from './entities/order.entity';
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { UserRole } from '../user/entities/user.entity';
import { Payload } from 'src/util/token.service';
import { companyWhere } from 'src/common/utils/company-scope';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
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
  async getOrders(user: Payload, companyId?: string) {
    const where: FindOptionsWhere<Order> =
      user.role === UserRole.EMPLOYEE
        ? { user: { id: user.sub }, ...companyWhere(user) }
        : companyWhere(user, companyId);

    return this.orderRepo.find({
      where,
      relations: {
        items: { product: { images: true } },
        user: { employee: true },
        company: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getOrder(user: Payload, id: string) {
    const order = await this.orderRepo.findOne({
      where: { id, ...companyWhere(user) },
      relations: {
        items: { product: { images: true } },
        user: { employee: true },
        company: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async changeStatus(user: Payload, id: string, status: OrderStatusEnum) {
    const order = await this.getOrder(user, id);

    order.status = status;

    return this.orderRepo.save(order);
  }

  async completeOrder(user: Payload, id: string) {
    return this.changeStatus(user, id, OrderStatusEnum.COMPLETED);
  }

  async cancelOrder(user: Payload, id: string) {
    return this.changeStatus(user, id, OrderStatusEnum.CANCELLED);
  }
}
