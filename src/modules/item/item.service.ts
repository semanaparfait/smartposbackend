import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Item } from './entities/item.entity';
import { EntityManager, Repository } from 'typeorm';
import { CartService } from '../cart/cart.service';
import {
  AddCartItemByCodeDto,
  AddCartItemByIdDto,
} from './dto/request/add-cart-item.dto';
import { ProductService } from '../product/product.service';
import { Cart, CartStatusEnum } from '../cart/entities/cart.entity';
import { Product } from '../product/entities/product.entity';
import { Payload } from 'src/util/token.service';
import {
  companyWhere,
  ownRecordsWhere,
} from 'src/common/utils/company-scope';

@Injectable()
export class ItemService {
  constructor(
    @InjectRepository(Item)
    private readonly itemRepo: Repository<Item>,

    @Inject(forwardRef(() => CartService))
    private readonly cartService: CartService,

    private readonly productService: ProductService,
  ) {}

  async addItemById(user: Payload, cartId: string, dto: AddCartItemByIdDto) {
    const cart = await this.getActiveCart(user, cartId);

    const product = await this.productService.getProduct({
      id: dto.productId,
      company: { id: cart.company.id },
    });

    await this.addToCart(cart, product, dto.quantity);
  }

  async addItemByCode(
    user: Payload,
    cartId: string,
    dto: AddCartItemByCodeDto,
  ) {
    const cart = await this.getActiveCart(user, cartId);

    const product = await this.productService.getProduct({
      barCode: dto.barCode,
      company: { id: cart.company.id },
    });

    await this.addToCart(cart, product, 1);
  }

  async updateItemQuantity(user: Payload, itemId: string, quantity: number) {
    const item = await this.getActiveItem(user, itemId);

    await this.setQuantity(item, quantity);

    await this.cartService.calculateCartTotal(item.cart.id);
  }

  async removeItem(user: Payload, id: string) {
    const item = await this.getActiveItem(user, id);

    await this.itemRepo.remove(item);

    await this.cartService.calculateCartTotal(item.cart.id);
  }

  async updateItem(item: Item, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(Item) : this.itemRepo;
    await repo.save(item);
  }

  // helpers

  private getActiveCart(user: Payload, cartId: string) {
    return this.cartService.getCart({
      id: cartId,
      status: CartStatusEnum.ACTIVE,
      ...companyWhere(user),
      ...ownRecordsWhere(user),
    });
  }

  private async getActiveItem(user: Payload, itemId: string) {
    const item = await this.itemRepo.findOne({
      where: {
        id: itemId,
        cart: {
          status: CartStatusEnum.ACTIVE,
          ...companyWhere(user),
          ...ownRecordsWhere(user),
        },
      },
      relations: { product: true, cart: { company: true } },
    });

    if (!item) throw new NotFoundException('Item not found');

    return item;
  }

  // Adding a product already in the cart increases its quantity.
  private async addToCart(cart: Cart, product: Product, quantity: number) {
    if (!product.active) throw new BadRequestException('Product is not active');

    const existing = cart.items.find((i) => i.product.id === product.id);

    // Only cart.id is persisted; the company is carried along for the audit log.
    const cartRef = { id: cart.id, company: cart.company } as Cart;

    if (existing) {
      existing.product = product;
      existing.cart = cartRef;
      await this.setQuantity(existing, existing.quantity + quantity);
    } else {
      await this.itemRepo.save(
        this.itemRepo.create({
          cart: cartRef,
          product: { id: product.id },
          quantity,
          totalPrice: Number(product.sellingPrice) * quantity,
        }),
      );
    }

    await this.cartService.calculateCartTotal(cart.id);
  }

  private async setQuantity(item: Item, quantity: number) {
    item.quantity = quantity;
    item.totalPrice = Number(item.product.sellingPrice) * quantity;

    await this.itemRepo.save(item);
  }
}
