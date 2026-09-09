import { BaseEntity } from 'src/common/entities/base.entity';
import { Company } from 'src/modules/company/entities/company.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

export enum RegistrationStatusEnum {
  PENDING = 'PENDING',
  REQUESTED = 'REQUESTED',
  REGISTERED = 'REGISTERED',
  REJECTED = 'REJECTED',
  DISABLED = 'DISABLED',
}

@Entity('devices')
export class Device extends BaseEntity {
  @Column({ name: 'device_id', unique: true })
  deviceId!: string;

  @Column({ name: 'device_name' })
  deviceName!: string;

  @Column({ name: 'device_os' })
  deviceOs!: string;

  @Column({
    type: 'enum',
    enum: RegistrationStatusEnum,
    default: RegistrationStatusEnum.PENDING,
    name: 'registration_status',
  })
  registrationStatus!: RegistrationStatusEnum;

  @ManyToOne(() => Company, (company) => company.devices, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company!: Company;
}
