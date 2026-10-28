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
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
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

  @Index('IDX_orders_user')
  @ManyToOne(() => User, (user) => user.orders, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
