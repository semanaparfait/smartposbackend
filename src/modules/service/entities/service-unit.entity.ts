import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { ServiceOffering } from './service.entity';

// OCCUPIED is set by check-in and cleared by check-out; staff set the others.
export enum ServiceUnitStatusEnum {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  CLEANING = 'CLEANING',
  MAINTENANCE = 'MAINTENANCE',
}

// One bookable thing of a service: Room 101, Pool table 2, Bike 7.
@Entity('service_units')
export class ServiceUnit extends BaseEntity {
  @Index('IDX_service_units_service')
  @ManyToOne(() => ServiceOffering, (service) => service.units, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'service_id',
    foreignKeyConstraintName: 'FK_service_units_service',
  })
  service!: ServiceOffering;

  @Column({ type: 'varchar', length: 60 })
  name!: string;

  @Column({
    type: 'enum',
    enum: ServiceUnitStatusEnum,
    enumName: 'service_units_status_enum',
    default: ServiceUnitStatusEnum.AVAILABLE,
  })
  status!: ServiceUnitStatusEnum;
}
