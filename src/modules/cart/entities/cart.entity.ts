import { BaseEntity } from 'src/common/entities/base.entity';
import { Item } from 'src/modules/item/entities/item.entity';
import { Seat } from 'src/modules/seat/entities/seat.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Company } from 'src/modules/company/entities/company.entity';
import { User } from 'src/modules/user/entities/user.entity';

export enum CartStatusEnum {
  ACTIVE = 'ACTIVE',
  CHECKED_OUT = 'CHECKED_OUT',
  // Put aside while the customer fetches something; the till can resume it.
  HELD = 'HELD',
}

@Index('IDX_carts_company_status', ['company', 'status'])
@Entity('carts')
export class Cart extends BaseEntity {
  @ManyToOne(() => Company, (company) => company.carts, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'company_id',
    foreignKeyConstraintName: 'FK_carts_company',
  })
  company!: Company;

  @Column({ type: 'enum', enum: CartStatusEnum })
  status!: CartStatusEnum;

  @Column({
    name: 'total_amount',
    type: 'decimal',
    scale: 2,
    default: 0,
  })
  totalAmount!: number;

  // Employee who opened the cart; employees only see their own carts.
  @Index('IDX_carts_user')
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_carts_user' })
  user!: User | null;

  @ManyToOne(() => Seat, (seat) => seat.carts, { nullable: true })
  @JoinColumn({ name: 'seat_id' })
  seat!: Seat;

  // Who the held sale belongs to, as the worker typed it.
  @Column({ name: 'held_for', type: 'varchar', length: 60, nullable: true })
  heldFor!: string | null;

  @Column({ name: 'held_at', type: 'timestamptz', nullable: true })
  heldAt!: Date | null;

  // When the till should ask whether the customer is still coming.
  @Column({ name: 'hold_until', type: 'timestamptz', nullable: true })
  holdUntil!: Date | null;

  @OneToMany(() => Item, (items) => items.cart)
  items!: Item[];
}
