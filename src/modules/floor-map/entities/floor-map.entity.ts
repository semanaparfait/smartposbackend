import { BaseEntity } from 'src/common/entities/base.entity';
import { Company } from 'src/modules/company/entities/company.entity';
import { Room } from 'src/modules/room/entities/room.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

@Entity('floor_maps')
export class FloorMap extends BaseEntity {
  @ManyToOne(() => Company, (company) => company.floorMaps)
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column()
  name!: string;

  @OneToMany(() => Room, (rooms) => rooms.floorMap)
  rooms!: Room[];
}
