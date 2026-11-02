import { BaseEntity } from 'src/common/entities/base.entity';
import { Company } from 'src/modules/company/entities/company.entity';
import { User } from 'src/modules/user/entities/user.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BookingPayment } from './booking-payment.entity';
import { PriceUnitEnum, ServiceOffering } from './service.entity';
import { ServiceUnit } from './service-unit.entity';

export enum BookingStatusEnum {
  RESERVED = 'RESERVED', // Booked ahead, not here yet
  ACTIVE = 'ACTIVE', // Checked in, using it now
  COMPLETED = 'COMPLETED', // Checked out
  CANCELLED = 'CANCELLED',
}

// One customer's use of a service. Paid through its own payments, not an order.
@Entity('bookings')
@Index('IDX_bookings_company_start', ['company', 'startAt'])
export class Booking extends BaseEntity {
  @ManyToOne(() => Company, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'company_id',
    foreignKeyConstraintName: 'FK_bookings_company',
  })
  company!: Company;

  @ManyToOne(() => ServiceOffering, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'service_id',
    foreignKeyConstraintName: 'FK_bookings_service',
  })
  service!: ServiceOffering;

  @Index('IDX_bookings_unit')
  @ManyToOne(() => ServiceUnit, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'unit_id', foreignKeyConstraintName: 'FK_bookings_unit' })
  unit!: ServiceUnit | null;

  // Staff member who made the booking.
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_bookings_user' })
  user!: User | null;

  // Short code to read out or write on a ticket, e.g. "B7K2QX".
  @Column({ type: 'varchar', length: 12 })
  code!: string;

  @Column({ name: 'customer_name', type: 'varchar', length: 120 })
  customerName!: string;

  @Column({
    name: 'customer_phone',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  customerPhone!: string | null;

  @Column({ type: 'int', default: 1 })
  people!: number;

  @Column({ name: 'start_at', type: 'timestamptz' })
  startAt!: Date;

  // Planned end; null for open-ended use (a pool table until they stop).
  @Column({ name: 'end_at', type: 'timestamptz', nullable: true })
  endAt!: Date | null;

  @Column({ name: 'checked_in_at', type: 'timestamptz', nullable: true })
  checkedInAt!: Date | null;

  @Column({ name: 'checked_out_at', type: 'timestamptz', nullable: true })
  checkedOutAt!: Date | null;

  @Column({
    type: 'enum',
    enum: BookingStatusEnum,
    enumName: 'bookings_status_enum',
    default: BookingStatusEnum.RESERVED,
  })
  status!: BookingStatusEnum;

  // Price at the time of booking, so later price changes don't alter it.
  @Column({
    name: 'price_unit',
    type: 'enum',
    enum: PriceUnitEnum,
    enumName: 'services_price_unit_enum',
  })
  priceUnit!: PriceUnitEnum;

  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2 })
  unitPrice!: number;

  // How many hours, nights, days, sessions or people are charged.
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total!: number;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({
    name: 'cancel_reason',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  cancelReason!: string | null;

  @OneToMany(() => BookingPayment, (payment) => payment.booking)
  payments!: BookingPayment[];
}
