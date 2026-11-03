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
  In,
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
import { ExtendHoldDto, HoldCartDto } from './dto/request/hold-cart.dto';
import { DeliveryService } from '../order/delivery.service';
import { CheckoutDto } from '../order/dto/request/delivery.dto';
import { RealtimeService } from '../realtime/realtime.service';
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

    private readonly realtime: RealtimeService,

    private readonly delivery: DeliveryService,
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

  async checkout(actor: Payload, cartId: string, dto: CheckoutDto = {}) {
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

      const delivery = dto.delivery
        ? await this.delivery.prepare(manager, cart.company.id, dto.delivery)
        : undefined;

      const order = await this.orderService.createOrder(
        {
          subtotal: Number(cart.totalAmount),
          tax: 0,
          user,
          companyId: cart.company.id,
          delivery,
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
    const created = await this.orderService.getOrder(actor, order.id);
    this.realtime.orderCreated(created);
    this.realtime.orderToPay(actor.deviceId, created);

    return created;
  }

  async abandon(user: Payload, cartId: string) {
    // A held sale can be cancelled too, when the customer doesn't come back.
    const cart = await this.getCart({
      id: cartId,
      status: In([CartStatusEnum.ACTIVE, CartStatusEnum.HELD]),
      ...companyWhere(user),
      ...ownRecordsWhere(user),
    });

    const removed = await this.cartRepo.remove(cart);
    this.realtime.displayCleared(user.deviceId);

    return removed;
  }

  // Puts the sale aside so the till can serve others while the customer fetches
  // something they forgot.
  async hold(user: Payload, cartId: string, dto: HoldCartDto) {
    const cart = await this.getCart({
      id: cartId,
      status: CartStatusEnum.ACTIVE,
      ...companyWhere(user),
      ...ownRecordsWhere(user),
    });

    if (cart.items.length === 0) throw new BadRequestException('Cart is Empty');

    const max = cart.company.maxHoldMinutes;
    if (dto.minutes > max)
      throw new BadRequestException(
        `A sale can be held for ${max} minutes at most`,
      );

    const now = new Date();
    cart.status = CartStatusEnum.HELD;
    cart.heldFor = dto.customerName;
    cart.heldAt = now;
    cart.holdUntil = new Date(now.getTime() + dto.minutes * 60_000);
    await this.cartRepo.save(cart);
    this.realtime.displayCleared(user.deviceId);

    return this.getCartView(cart.id);
  }

  // The customer is still coming: wait longer, but never past the company's limit
  // counted from when the sale was first held.
  async extendHold(user: Payload, cartId: string, dto: ExtendHoldDto) {
    const cart = await this.getHeldCart(user, cartId);
    const max = cart.company.maxHoldMinutes;
    const limit = cart.heldAt!.getTime() + max * 60_000;
    const from = Math.max(Date.now(), cart.holdUntil!.getTime());

    if (from >= limit)
      throw new BadRequestException(
        `A sale can be held for ${max} minutes at most`,
      );

    cart.holdUntil = new Date(Math.min(from + dto.minutes * 60_000, limit));
    await this.cartRepo.save(cart);

    return this.getCartView(cart.id);
  }

  // Back on the till. Only one sale is open at a time, so the current one must be
  // empty; empty ones are cleared away.
  async resume(user: Payload, cartId: string) {
    const cart = await this.getHeldCart(user, cartId);

    const open = await this.cartRepo.find({
      where: {
        status: CartStatusEnum.ACTIVE,
        user: { id: user.sub },
        ...companyWhere(user),
      },
      relations: { items: true },
    });

    if (open.some((c) => c.items.length > 0))
      throw new BadRequestException('Finish or hold the current sale first');

    await this.cartRepo.remove(open);

    cart.status = CartStatusEnum.ACTIVE;
    cart.heldFor = null;
    cart.heldAt = null;
    cart.holdUntil = null;
    await this.cartRepo.save(cart);

    return this.getCartView(cart.id);
  }

  private getHeldCart(user: Payload, cartId: string) {
    return this.getCart({
      id: cartId,
      status: CartStatusEnum.HELD,
      ...companyWhere(user),
      ...ownRecordsWhere(user),
    });
  }

  // One statement instead of loading and re-saving the cart: this runs on every
  // tap or scan. The total is derived from the items (whose changes are in the
  // audit history), so it is not recorded separately.
  async calculateCartTotal(cartId: string) {
    await this.dataSource.query(
      `UPDATE carts
          SET total_amount = (SELECT COALESCE(SUM(total_price), 0)
                                FROM items WHERE cart_id = $1),
              "updatedAt" = $2
        WHERE id = $1`,
      [cartId, new Date()],
    );
  }
}
