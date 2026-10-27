import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Order } from './order.entity';

export enum PaymentMethodEnum {
  CASH = 'CASH',
  MOMO = 'MOMO',
  CARD = 'CARD',
  CREDIT = 'CREDIT',
}

// One part of an order's payment; an order can be split across several methods.
@Entity('payments')
export class Payment extends BaseEntity {
  @ManyToOne(() => Order, (order) => order.payments, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'order_id',
    foreignKeyConstraintName: 'FK_payments_order',
  })
  order!: Order;

  @Column({ type: 'enum', enum: PaymentMethodEnum })
  method!: PaymentMethodEnum;

  @Column({ type: 'decimal', scale: 2 })
  amount!: number;

  // Credit only: who owes the money.
  @Column({ name: 'credit_owner_name', type: 'varchar', nullable: true })
  creditOwnerName!: string | null;

  @Column({ name: 'credit_owner_phone', type: 'varchar', nullable: true })
  creditOwnerPhone!: string | null;

  // Credit only: who physically took the goods (may differ from the owner).
  @Column({ name: 'taken_by', type: 'varchar', nullable: true })
  takenBy!: string | null;
}
