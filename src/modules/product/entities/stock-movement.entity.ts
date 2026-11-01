import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from 'src/modules/order/entities/order.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { Product } from './product.entity';

export enum StockMovementReasonEnum {
  SALE = 'SALE',
  RESTOCK = 'RESTOCK',
  ADJUSTMENT = 'ADJUSTMENT',
  REFUND = 'REFUND',
}

// Every change to a product's stock: why the number is what it is. A log, so it
// is never updated and stays out of the audit history.
@Index('IDX_stock_movements_product_created', ['product', 'createdAt'])
@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => Product, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  // Positive adds stock, negative removes it.
  @Column({ type: 'decimal', precision: 12, scale: 3 })
  change!: number;

  @Column({ name: 'quantity_after', type: 'decimal', precision: 12, scale: 3 })
  quantityAfter!: number;

  @Column({ type: 'enum', enum: StockMovementReasonEnum })
  reason!: StockMovementReasonEnum;

  @Column({ type: 'varchar', nullable: true })
  note!: string | null;

  @ManyToOne(() => Order, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'order_id' })
  order!: Order | null;

  // Who made the change.
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user!: User | null;
}
