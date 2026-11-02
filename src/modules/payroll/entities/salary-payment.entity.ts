import { BaseEntity } from 'src/common/entities/base.entity';
import { Company } from 'src/modules/company/entities/company.entity';
import { Employee } from 'src/modules/employee/entities/employee.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { StaffDebtPayment } from './staff-debt-payment.entity';

export enum SalaryMethodEnum {
  CASH = 'CASH',
  MOMO = 'MOMO',
  BANK = 'BANK',
}

// One month's salary actually paid to a worker. One per worker per month, so a
// month can't be paid twice.
@Entity('salary_payments')
@Index('IDX_salary_payments_employee_month', ['employee', 'month'], {
  unique: true,
})
export class SalaryPayment extends BaseEntity {
  @ManyToOne(() => Company, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'company_id',
    foreignKeyConstraintName: 'FK_salary_payments_company',
  })
  company!: Company;

  @ManyToOne(() => Employee, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'employee_id',
    foreignKeyConstraintName: 'FK_salary_payments_employee',
  })
  employee!: Employee;

  // YYYY-MM
  @Column({ type: 'varchar', length: 7 })
  month!: string;

  // The salary that month, as it was then.
  @Column({ type: 'decimal', precision: 14, scale: 2 })
  salary!: number;

  // Taken off for what the worker owed.
  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  deducted!: number;

  // Handed to the worker.
  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount!: number;

  @Column({
    type: 'enum',
    enum: SalaryMethodEnum,
    enumName: 'salary_payments_method_enum',
  })
  method!: SalaryMethodEnum;

  @Column({ name: 'paid_on', type: 'date' })
  paidOn!: string;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  // Who paid.
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_salary_payments_user',
  })
  user!: User | null;

  // The debt payment recording the deduction, undone with this.
  @ManyToOne(() => StaffDebtPayment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'debt_payment_id',
    foreignKeyConstraintName: 'FK_salary_payments_debt_payment',
  })
  debtPayment!: StaffDebtPayment | null;
}
