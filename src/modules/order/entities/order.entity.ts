import { BaseEntity } from 'src/common/entities/base.entity';
import { Item } from 'src/modules/item/entities/item.entity';
import { User } from 'src/modules/user/entities/user.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Company } from 'src/modules/company/entities/company.entity';
import { Payment } from './payment.entity';

export enum OrderStatusEnum {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  READY = 'READY',
  // Taken to the customer. Payment can still follow.
  SERVED = 'SERVED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum OrderTypeEnum {
  IN_STORE = 'IN_STORE',
  DELIVERY = 'DELIVERY',
}

// Where a delivery order is; null for in-store orders.
export enum DeliveryStatusEnum {
  WAITING = 'WAITING', // not sent yet (may still be cooking)
  ON_THE_WAY = 'ON_THE_WAY',
  DELIVERED = 'DELIVERED',
  NOT_DELIVERED = 'NOT_DELIVERED',
}

// The kitchen's progress on a delivery paid before its food was ready (once paid,
// `status` is COMPLETED). null when nothing is left for the kitchen.
export enum KitchenStatusEnum {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
}

@Index('IDX_orders_company_created', ['company', 'createdAt'])
@Entity('orders')
export class Order extends BaseEntity {
  @ManyToOne(() => Company, (company) => company.orders, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'company_id',
    foreignKeyConstraintName: 'FK_orders_company',
  })
  company!: Company;

  @Column({ type: 'enum', enum: OrderStatusEnum })
  status!: OrderStatusEnum;

  @Column({
    type: 'decimal',
    scale: 2,
  })
  subtotal!: number;

  @Column({
    type: 'decimal',
    scale: 2,
  })
  tax!: number;

  @Column({
    type: 'decimal',
    scale: 2,
  })
  total!: number;

  @Column({ nullable: true })
  note!: string;

  @OneToMany(() => Item, (items) => items.order)
  items!: Item[];

  @OneToMany(() => Payment, (payment) => payment.order)
  payments!: Payment[];

  @Column({
    type: 'enum',
    enum: OrderTypeEnum,
    default: OrderTypeEnum.IN_STORE,
  })
  type!: OrderTypeEnum;

  @Column({
    name: 'delivery_status',
    type: 'enum',
    enum: DeliveryStatusEnum,
    nullable: true,
  })
  deliveryStatus!: DeliveryStatusEnum | null;

  // Included in `total`.
  @Column({
    name: 'delivery_fee',
    type: 'decimal',
    scale: 2,
    default: 0,
  })
  deliveryFee!: number;

  @Column({
    name: 'customer_name',
    type: 'varchar',
    length: 80,
    nullable: true,
  })
  customerName!: string | null;

  @Column({
    name: 'customer_phone',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  customerPhone!: string | null;

  // Where to take it, as the worker typed it (street, landmark).
  @Column({ name: 'delivery_address', type: 'text', nullable: true })
  deliveryAddress!: string | null;

  // The owner's delivery area it went to, when areas are set.
  @Column({
    name: 'delivery_area',
    type: 'varchar',
    length: 60,
    nullable: true,
  })
  deliveryArea!: string | null;

  // One of the shop's riders...
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'rider_id', foreignKeyConstraintName: 'FK_orders_rider' })
  rider!: User | null;

  // ...or an outside service, as typed (e.g. "Moto - Eric 0788...").
  @Column({
    name: 'outside_rider',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  outsideRider!: string | null;

  // Paid when delivered rather than at the till.
  @Column({ name: 'pay_on_delivery', default: false })
  payOnDelivery!: boolean;

  // Who took the money at the door; their money check covers it.
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'collected_by_id',
    foreignKeyConstraintName: 'FK_orders_collected_by',
  })
  collectedBy!: User | null;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt!: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt!: Date | null;

  @Column({
    name: 'kitchen_status',
    type: 'enum',
    enum: KitchenStatusEnum,
    nullable: true,
  })
  kitchenStatus!: KitchenStatusEnum | null;

  // Why it couldn't be delivered.
  @Column({ name: 'delivery_problem', type: 'text', nullable: true })
  deliveryProblem!: string | null;

  @Index('IDX_orders_user')
  @ManyToOne(() => User, (user) => user.orders, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
