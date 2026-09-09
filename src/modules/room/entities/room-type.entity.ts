import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, OneToMany } from 'typeorm';
import { Room } from './room.entity';

@Entity('room_types')
export class RoomType extends BaseEntity {
  @Column()
  name!: string;

  @OneToMany(() => Room, (rooms) => rooms.roomType)
  rooms!: Room[];
}
