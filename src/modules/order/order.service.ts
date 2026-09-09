import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/request/create-order.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Order, OrderStatusEnum } from './entities/order.entity';
import {
  DataSource,
  EntityManager,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import { UserService } from '../user/user.service';
import { UserRole } from '../user/entities/user.entity';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,

    private readonly userService: UserService,
  ) {}

  async createOrder(dto: CreateOrderDto, repo: EntityManager) {
    const order = repo.create(Order, {
      status: OrderStatusEnum.PENDING,
      subtotal: dto.subtotal,
      tax: dto.tax,
      total: dto.subtotal - dto.tax,
      note: dto.note,
      user: dto.user,
    });

    return await repo.save(order);
  }

  async getOrders(userId: string) {
    const user = await this.userService.findOne({ id: userId });

    if (!user) throw new UnauthorizedException();

    let where: FindOptionsWhere<Order> = {};

    if (user.role === UserRole.EMPLOYEE) where.user = { id: userId };

    return this.orderRepo.find({
      where,
      relations: {
        items: { product: { images: true } },
        user: { employee: true },
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getOrder(id: string) {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: {
        items: { product: { images: true } },
        user: { employee: true },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async changeStatus(id: string, status: OrderStatusEnum) {
    const order = await this.getOrder(id);

    order.status = status;

    return this.orderRepo.save(order);
  }

  async completeOrder(id: string) {
    const order = await this.getOrder(id);

    order.status = OrderStatusEnum.COMPLETED;

    return this.orderRepo.save(order);
  }

  async cancelOrder(id: string) {
    const order = await this.getOrder(id);

    order.status = OrderStatusEnum.CANCELLED;

    return this.orderRepo.save(order);
  }
}
