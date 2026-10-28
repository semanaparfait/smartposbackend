import { BaseEntity } from 'src/common/entities/base.entity';
import { Cart } from 'src/modules/cart/entities/cart.entity';
import { Order } from 'src/modules/order/entities/order.entity';
import { Product } from 'src/modules/product/entities/product.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

@Entity('items')
export class Item extends BaseEntity {
  @Index('IDX_items_product')
  @ManyToOne(() => Product, (product) => product.items)
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Column()
  quantity!: number;

  @Column({ name: 'total_price', type: 'decimal', scale: 2 })
  totalPrice!: number;

  @Index('IDX_items_cart')
  @ManyToOne(() => Cart, (cart) => cart.items, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cart_id' })
  cart!: Cart;

  @Index('IDX_items_order')
  @ManyToOne(() => Order, (order) => order.items)
  @JoinColumn({ name: 'order_id' })
  order!: Order;
}
