import { BaseEntity } from 'src/common/entities/base.entity';
import { Item } from 'src/modules/item/entities/item.entity';
import { Seat } from 'src/modules/seat/entities/seat.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

export enum CartStatusEnum {
  ACTIVE = 'ACTIVE',
  CHECKED_OUT = 'CHECKED_OUT',
}

@Entity('carts')
export class Cart extends BaseEntity {
  @Column({ type: 'enum', enum: CartStatusEnum })
  status!: CartStatusEnum;

  @Column({
    name: 'total_amount',
    type: 'decimal',
    scale: 2,
    default: 0,
  })
  totalAmount!: number;

  @ManyToOne(() => Seat, (seat) => seat.carts, { nullable: true })
  @JoinColumn({ name: 'seat_id' })
  seat!: Seat;

  @OneToMany(() => Item, (items) => items.cart)
  items!: Item[];
}
