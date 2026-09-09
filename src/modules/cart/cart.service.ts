import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import { Cart, CartStatusEnum } from './entities/cart.entity';
import { CreateCartDto } from './dto/request/create-cart.dto';
import { Seat } from '../seat/entities/seat.entity';
import { SeatService } from '../seat/seat.service';
import { OrderService } from '../order/order.service';
import { Item } from '../item/entities/item.entity';
import { Order, OrderStatusEnum } from '../order/entities/order.entity';
import { ItemService } from '../item/item.service';
import { UserService } from '../user/user.service';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepo: Repository<Cart>,
    private readonly dataSource: DataSource,

    private readonly seatService: SeatService,

    private readonly orderService: OrderService,

    @Inject(forwardRef(() => ItemService))
    private readonly itemService: ItemService,

    private readonly userService: UserService,
  ) {}

  async createCart(dto: CreateCartDto) {
    let seat: Seat | undefined = undefined;

    if (dto.seatId) {
      seat = await this.seatService.getSeat(dto.seatId);
    }

    const cart = this.cartRepo.create({
      status: CartStatusEnum.ACTIVE,
      seat,
    });

    return this.cartRepo.save(cart);
  }

  async findCarts() {
    return this.cartRepo.find({
      relations: { items: { product: { images: true } } },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getCart(where: FindOptionsWhere<Cart>, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(Cart) : this.cartRepo;

    const cart = await repo.findOne({
      where,
      relations: { items: { product: true } },
    });

    if (!cart) throw new NotFoundException('Cart not found');

    return cart;
  }

  async update(cart: Partial<Cart>) {
    const existingCart = await this.cartRepo.preload(cart);

    if (!existingCart) throw new NotFoundException('Cart not found');

    return await this.cartRepo.save(existingCart);
  }

  async checkout(userId: string, cartId: string) {
    return await this.dataSource.transaction(async (manager) => {
      const user = await this.userService.findOne({ id: userId }, manager);

      if (!user) throw new UnauthorizedException();

      const cart = await manager.findOne(Cart, {
        where: { id: cartId, status: CartStatusEnum.ACTIVE },
        relations: { items: { product: true } },
      });

      if (!cart) throw new NotFoundException('Cart not found');

      if (cart.items.length <= 0)
        throw new BadRequestException('Cart is Empty');

      const order = await this.orderService.createOrder(
        {
          subtotal: cart.totalAmount,
          tax: 0,
          user,
        },
        manager,
      );

      for (const item of cart.items) {
        item.order = order;
      }

      await manager.save(Item, cart.items);

      await manager.delete(Cart, { id: cart.id });

      return { ...order };
    });
  }

  async abandon(cartId: string) {
    const cart = await this.getCart({
      id: cartId,
      status: CartStatusEnum.ACTIVE,
    });

    return this.cartRepo.remove(cart);
  }

  async calculateCartTotal(cartId: string) {
    const cart = await this.getCart({ id: cartId });

    const items = cart.items;

    cart.totalAmount = items.reduce((sum, i) => sum + Number(i.totalPrice), 0);

    await this.update(cart);
  }
}
