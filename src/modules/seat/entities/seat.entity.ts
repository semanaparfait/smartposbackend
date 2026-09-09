import { BaseEntity } from 'src/common/entities/base.entity';
import { Cart } from 'src/modules/cart/entities/cart.entity';
import { Order } from 'src/modules/order/entities/order.entity';
import { Room } from 'src/modules/room/entities/room.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

export enum SeatStatusEnum {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  OCCUPIED = 'OCCUPIED',
  CLEANING = 'CLEANING',
  BLOCKED = 'BLOCKED',
}

@Entity('seats')
export class Seat extends BaseEntity {
  @Column()
  name!: string;

  @Column()
  xCoordinate!: number;

  @Column()
  yCoordinate!: number;

  @Column({ type: 'enum', enum: SeatStatusEnum })
  status!: SeatStatusEnum;

  @OneToMany(() => Cart, (cart) => cart.seat)
  carts!: Cart[];

  @ManyToOne(() => Room, (room) => room.seats)
  @JoinColumn({ name: 'room_id' })
  room!: Room;
}
