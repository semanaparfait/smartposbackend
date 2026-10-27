import { BaseEntity } from 'src/common/entities/base.entity';
import { Item } from 'src/modules/item/entities/item.entity';
import { Seat } from 'src/modules/seat/entities/seat.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Company } from 'src/modules/company/entities/company.entity';

export enum CartStatusEnum {
  ACTIVE = 'ACTIVE',
  CHECKED_OUT = 'CHECKED_OUT',
}

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

  @ManyToOne(() => Seat, (seat) => seat.carts, { nullable: true })
  @JoinColumn({ name: 'seat_id' })
  seat!: Seat;

  @OneToMany(() => Item, (items) => items.cart)
  items!: Item[];
}
