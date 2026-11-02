import { BaseEntity } from 'src/common/entities/base.entity';
import { PaymentMethodEnum } from 'src/modules/order/entities/payment.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Booking } from './booking.entity';

export enum ReceiptStatusEnum {
  PENDING = 'PENDING', // Not checked yet
  CONFIRMED = 'CONFIRMED', // The money was received (or, for a refund, given back)
  MISSING = 'MISSING', // Checked and not there
}

// Money taken for a booking (a deposit, the balance, or both at once), or given
// back as a refund. Credit is not taken here: what is still owed is the booking's
// balance.
@Entity('booking_payments')
export class BookingPayment extends BaseEntity {
  @Index('IDX_booking_payments_booking')
  @ManyToOne(() => Booking, (booking) => booking.payments, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'booking_id',
    foreignKeyConstraintName: 'FK_booking_payments_booking',
  })
  booking!: Booking;

  @Column({
    type: 'enum',
    enum: PaymentMethodEnum,
    enumName: 'booking_payments_method_enum',
  })
  method!: PaymentMethodEnum;

  // Always positive; a refund takes it off what was paid.
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ name: 'is_refund', default: false })
  isRefund!: boolean;

  // Why the money was given back (refunds only).
  @Column({ type: 'varchar', length: 255, nullable: true })
  reason!: string | null;

  // Staff member who took (or gave back) the money.
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_booking_payments_user',
  })
  user!: User | null;

  // Checked by someone who verifies takings: was the money really received?
  @Column({
    type: 'enum',
    enum: ReceiptStatusEnum,
    enumName: 'booking_payments_receipt_enum',
    default: ReceiptStatusEnum.PENDING,
  })
  receipt!: ReceiptStatusEnum;

  // Required when the money was not received: what happened.
  @Column({
    name: 'receipt_note',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  receiptNote!: string | null;

  @Column({
    name: 'receipt_checked_at',
    type: 'timestamptz',
    nullable: true,
  })
  receiptCheckedAt!: Date | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'receipt_checked_by_id',
    foreignKeyConstraintName: 'FK_booking_payments_checked_by',
  })
  receiptCheckedBy!: User | null;
}
