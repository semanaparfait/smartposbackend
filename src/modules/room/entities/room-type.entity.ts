import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Company } from 'src/modules/company/entities/company.entity';
import { Room } from './room.entity';

@Entity('room_types')
export class RoomType extends BaseEntity {
  @ManyToOne(() => Company, (company) => company.roomTypes, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'company_id',
    foreignKeyConstraintName: 'FK_room_types_company',
  })
  company!: Company;

  @Column()
  name!: string;

  @OneToMany(() => Room, (rooms) => rooms.roomType)
  rooms!: Room[];
}
