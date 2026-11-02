import { BaseEntity } from 'src/common/entities/base.entity';
import { Company } from 'src/modules/company/entities/company.entity';
import { Employee } from 'src/modules/employee/entities/employee.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

// SALARY = taken off the salary on payday.
export enum DebtPaymentMethodEnum {
  CASH = 'CASH',
  MOMO = 'MOMO',
  SALARY = 'SALARY',
}

export enum DebtPaymentStatusEnum {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

// Money a worker gives back towards what they owe. A worker's own payment
// waits for approval; once approved it no longer comes off their salary.
@Entity('staff_debt_payments')
export class StaffDebtPayment extends BaseEntity {
  @ManyToOne(() => Company, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'company_id',
    foreignKeyConstraintName: 'FK_staff_debt_payments_company',
  })
  company!: Company;

  @Index('IDX_staff_debt_payments_employee')
  @ManyToOne(() => Employee, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'employee_id',
    foreignKeyConstraintName: 'FK_staff_debt_payments_employee',
  })
  employee!: Employee;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount!: number;

  @Column({
    type: 'enum',
    enum: DebtPaymentMethodEnum,
    enumName: 'staff_debt_payments_method_enum',
  })
  method!: DebtPaymentMethodEnum;

  @Column({
    type: 'enum',
    enum: DebtPaymentStatusEnum,
    enumName: 'staff_debt_payments_status_enum',
    default: DebtPaymentStatusEnum.PENDING,
  })
  status!: DebtPaymentStatusEnum;

  @Column({ name: 'proof_url', type: 'varchar', nullable: true })
  proofUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  // Who sent it: the worker, or the manager recording it.
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_staff_debt_payments_user',
  })
  user!: User | null;

  @Column({
    name: 'review_note',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  reviewNote!: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt!: Date | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'reviewed_by_id',
    foreignKeyConstraintName: 'FK_staff_debt_payments_reviewed_by',
  })
  reviewedBy!: User | null;
}
