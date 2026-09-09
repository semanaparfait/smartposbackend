import {
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
import { CartStatusEnum } from '../cart/entities/cart.entity';

@Injectable()
export class ItemService {
  constructor(
    @InjectRepository(Item)
    private readonly itemRepo: Repository<Item>,

    @Inject(forwardRef(() => CartService))
    private readonly cartService: CartService,

    private readonly productService: ProductService,
  ) {}

  async addItemById(cartId: string, dto: AddCartItemByIdDto) {
    let cart = await this.cartService.getCart({
      id: cartId,
      status: CartStatusEnum.ACTIVE,
    });

    const product = await this.productService.getProduct({
      id: dto.productId,
    });

    let item = cart.items.find((i) => i.product.id === product.id);

    if (!item) {
      item = this.itemRepo.create({
        cart: { id: cart.id },
        product: { id: product.id },
        quantity: dto.quantity,
        totalPrice: Number(product.sellingPrice) * dto.quantity,
      });

      await this.itemRepo.save(item);
    } else {
      await this.updateItemQuantity(item.id, dto.quantity);
    }

    await this.cartService.calculateCartTotal(cart.id);
  }

  async addItemByCode(cartId: string, dto: AddCartItemByCodeDto) {
    let cart = await this.cartService.getCart({
      id: cartId,
      status: CartStatusEnum.ACTIVE,
    });

    const product = await this.productService.getProduct({
      barCode: dto.barCode,
    });

    let item = cart.items.find((i) => i.product.id === product.id);

    if (!item) {
      item = this.itemRepo.create({
        cart: { id: cart.id },
        product: { id: product.id },
        quantity: 1,
        totalPrice: Number(product.sellingPrice) * 1,
      });

      await this.itemRepo.save(item);
    } else {
      await this.updateItemQuantity(item.id, 1);
    }

    await this.cartService.calculateCartTotal(cart.id);
  }

  async updateItemQuantity(itemId: string, quantity: number) {
    let item = await this.itemRepo.findOne({
      where: { id: itemId, cart: { status: CartStatusEnum.ACTIVE } },
      relations: { product: true, cart: true },
    });

    if (!item) throw new NotFoundException('Item not found');

    item.quantity = quantity;

    item.totalPrice = Number(item.product.sellingPrice) * quantity;

    await this.itemRepo.save(item);

    await this.cartService.calculateCartTotal(item.cart.id);
  }

  async removeItem(id: string) {
    const item = await this.itemRepo.findOne({
      where: { id, cart: { status: CartStatusEnum.ACTIVE } },
      relations: { product: true, cart: true },
    });

    if (!item) throw new NotFoundException('Item not found');

    await this.itemRepo.remove(item);

    await this.cartService.calculateCartTotal(item.cart.id);
  }

  async updateItem(item: Item, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(Item) : this.itemRepo;
    await repo.save(item);
  }
}
