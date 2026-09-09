import { BaseEntity } from 'src/common/entities/base.entity';
import { Item } from 'src/modules/item/entities/item.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

export enum OrderStatusEnum {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  READY = 'READY',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('orders')
export class Order extends BaseEntity {
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

  @ManyToOne(() => User, (user) => user.orders, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
