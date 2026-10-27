import { BaseEntity } from 'src/common/entities/base.entity';
import { Company } from 'src/modules/company/entities/company.entity';
import { User } from 'src/modules/user/entities/user.entity';
import {
  AfterLoad,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { DeviceActivity } from './device-activity.entity';

export enum RegistrationStatusEnum {
  PENDING = 'PENDING',
  REQUESTED = 'REQUESTED',
  REGISTERED = 'REGISTERED',
  REJECTED = 'REJECTED',
  DISABLED = 'DISABLED',
}

// A device counts as online if it has called the API (any request or heartbeat) within this window.
export const DEVICE_ONLINE_WINDOW_MS = 2 * 60 * 1000;

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

  // User currently signed in on this device (cleared on logout).
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'current_user_id' })
  currentUser!: User | null;

  @Column({ name: 'last_seen_at', type: 'timestamp', nullable: true })
  lastSeenAt!: Date | null;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt!: Date | null;

  @Column({ name: 'last_activity', type: 'varchar', nullable: true })
  lastActivity!: string | null;

  @Column({ name: 'last_activity_at', type: 'timestamp', nullable: true })
  lastActivityAt!: Date | null;

  // SHA-256 of the device secret the terminal sends with heartbeats (never selected by default).
  @Column({
    name: 'secret_hash',
    type: 'varchar',
    nullable: true,
    select: false,
  })
  secretHash!: string | null;

  @OneToMany(() => DeviceActivity, (activity) => activity.device)
  activities!: DeviceActivity[];

  online!: boolean;

  @AfterLoad()
  computeOnline() {
    this.online =
      !!this.lastSeenAt &&
      Date.now() - new Date(this.lastSeenAt).getTime() <
        DEVICE_ONLINE_WINDOW_MS;
  }
}
