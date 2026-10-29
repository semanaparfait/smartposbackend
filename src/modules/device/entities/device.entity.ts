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

// What the device is used for, set by the owner. Decides what can be done on it
// (see @DeviceTypes) and which screen the app shows.
export enum DeviceTypeEnum {
  // Cashier till: products, carts, payments, sales.
  POS_TERMINAL = 'POS_TERMINAL',
  // Kitchen screen: incoming orders, preparing, ready. No selling.
  KITCHEN_DISPLAY = 'KITCHEN_DISPLAY',
  // Customer-facing screen paired with a till: shows its cart and payment.
  // Nobody signs in on it.
  CUSTOMER_DISPLAY = 'CUSTOMER_DISPLAY',
}

export const DEVICE_TYPE_LABELS: Record<DeviceTypeEnum, string> = {
  [DeviceTypeEnum.POS_TERMINAL]: 'POS terminal',
  [DeviceTypeEnum.KITCHEN_DISPLAY]: 'kitchen display',
  [DeviceTypeEnum.CUSTOMER_DISPLAY]: 'customer display',
};

// The code a device shows: its own, else (customer display) its till's.
export function deviceMomoCode(device: Device) {
  return device.momoCode ?? device.displayFor?.momoCode ?? null;
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

  @Column({
    type: 'enum',
    enum: DeviceTypeEnum,
    enumName: 'devices_type_enum',
    default: DeviceTypeEnum.POS_TERMINAL,
  })
  type!: DeviceTypeEnum;

  // For a customer display: the till whose cart and payment it shows.
  @ManyToOne(() => Device, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'display_for_id' })
  displayFor!: Device | null;

  // The MoMo pay code customers pay to at this device. A customer display
  // without its own shows its till's (see deviceMomoCode).
  @Column({ name: 'momo_code', type: 'varchar', length: 12, nullable: true })
  momoCode!: string | null;

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
