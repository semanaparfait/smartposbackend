import { BaseEntity } from 'src/common/entities/base.entity';
import { Seat } from 'src/modules/seat/entities/seat.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { RoomType } from './room-type.entity';
import { FloorMap } from 'src/modules/floor-map/entities/floor-map.entity';

export enum RoomStatusEnum {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  OCCUPIED = 'OCCUPIED',
  CLEANING = 'CLEANING',
  MAINTENANCE = 'MAINTENANCE',
}

@Entity('rooms')
export class Room extends BaseEntity {
  @ManyToOne(() => FloorMap, (floorMap) => floorMap.rooms)
  @JoinColumn({ name: 'floor_map_id' })
  floorMap!: FloorMap;

  @ManyToOne(() => RoomType, (roomType) => roomType.rooms)
  @JoinColumn({ name: 'room_type_id' })
  roomType!: RoomType;

  @Column()
  name!: string;

  @Column({ type: 'enum', enum: RoomStatusEnum })
  status!: RoomStatusEnum;

  @OneToMany(() => Seat, (seats) => seats.room)
  seats!: Seat[];
}
