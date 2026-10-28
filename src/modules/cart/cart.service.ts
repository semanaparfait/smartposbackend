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
import { Order } from '../order/entities/order.entity';
import { ItemService } from '../item/item.service';
import { UserService } from '../user/user.service';
import { Payload } from 'src/util/token.service';
import {
  companyWhere,
  ownRecordsWhere,
  targetCompanyId,
} from 'src/common/utils/company-scope';

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

  async createCart(user: Payload, dto: CreateCartDto) {
    const companyId = targetCompanyId(user, dto.companyId);

    let seat: Seat | undefined = undefined;

    if (dto.seatId) {
      seat = await this.seatService.getSeat(user, dto.seatId);

      if (seat.room?.floorMap?.company?.id !== companyId)
        throw new NotFoundException('Seat not found');
    }

    const cart = this.cartRepo.create({
      status: CartStatusEnum.ACTIVE,
      company: { id: companyId },
      user: { id: user.sub },
      seat,
    });

    return this.cartRepo.save(cart);
  }

  // Employees see the carts they opened, owners their company's, super admin everything.
  // Pass a status to skip the (ever-growing) checked-out history, e.g. the till
  // only needs ACTIVE carts.
  async findCarts(user: Payload, companyId?: string, status?: CartStatusEnum) {
    return this.cartRepo.find({
      where: {
        ...companyWhere(user, companyId),
        ...ownRecordsWhere(user),
        ...(status ? { status } : {}),
      },
      relations: { items: { product: { images: true } }, user: true },
      // Items in the order they were added, so lines don't jump around.
      order: {
        createdAt: 'DESC',
        items: { createdAt: 'ASC' },
      },
    });
  }

  // A cart as the till shows it (same shape as findCarts), returned after item
  // changes so the client doesn't have to fetch the cart list again.
  async getCartView(cartId: string) {
    const cart = await this.cartRepo.findOne({
      where: { id: cartId },
      relations: { items: { product: { images: true } }, user: true },
      order: { items: { createdAt: 'ASC' } },
    });

    if (!cart) throw new NotFoundException('Cart not found');

    return cart;
  }

  // When called on behalf of a user, `where` must include the company and
  // own-records scope.
  async getCart(where: FindOptionsWhere<Cart>, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(Cart) : this.cartRepo;

    const cart = await repo.findOne({
      where,
      relations: { items: { product: true }, company: true },
    });

    if (!cart) throw new NotFoundException('Cart not found');

    return cart;
  }

  async update(cart: Partial<Cart>) {
    const existingCart = await this.cartRepo.preload(cart);

    if (!existingCart) throw new NotFoundException('Cart not found');

    return await this.cartRepo.save(existingCart);
  }

  async checkout(actor: Payload, cartId: string) {
    const order = await this.dataSource.transaction(async (manager) => {
      const user = await this.userService.findOne({ id: actor.sub }, manager);

      if (!user) throw new UnauthorizedException();

      const cart = await manager.findOne(Cart, {
        where: {
          id: cartId,
          status: CartStatusEnum.ACTIVE,
          ...companyWhere(actor),
          ...ownRecordsWhere(actor),
        },
        relations: { items: { product: true }, company: true },
      });

      if (!cart) throw new NotFoundException('Cart not found');

      if (cart.items.length <= 0)
        throw new BadRequestException('Cart is Empty');

      const order = await this.orderService.createOrder(
        {
          subtotal: Number(cart.totalAmount),
          tax: 0,
          user,
          companyId: cart.company.id,
        },
        manager,
      );

      for (const item of cart.items) {
        item.order = { id: order.id, company: order.company } as Order;
      }

      await manager.save(Item, cart.items);

      // remove() (rather than delete()) so the removal is recorded in the audit log.
      await manager.remove(Cart, cart);

      return order;
    });

    // The full order (items, payments) like GET /orders/:id, so the till can show
    // the payment screen without fetching it again.
    return this.orderService.getOrder(actor, order.id);
  }

  async abandon(user: Payload, cartId: string) {
    const cart = await this.getCart({
      id: cartId,
      status: CartStatusEnum.ACTIVE,
      ...companyWhere(user),
      ...ownRecordsWhere(user),
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
