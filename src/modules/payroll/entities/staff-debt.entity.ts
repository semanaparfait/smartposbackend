import { BaseEntity } from 'src/common/entities/base.entity';
import { Company } from 'src/modules/company/entities/company.entity';
import { Employee } from 'src/modules/employee/entities/employee.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

export enum StaffDebtKindEnum {
  SHORTAGE = 'SHORTAGE', // Money missing from their count
  ADVANCE = 'ADVANCE', // Paid part of the salary early
  GOODS = 'GOODS', // Took goods for themselves
  DAMAGE = 'DAMAGE', // Broke or lost something
  EXPENSE = 'EXPENSE', // A rejected expense paid out of the till
  OTHER = 'OTHER',
}

// The `source` of a debt charged for a booking payment reported as not received.
export const serviceDebtSource = (paymentId: string) =>
  `service-payment:${paymentId}`;

// Money a worker owes the company. It comes off their salary until paid back.
@Entity('staff_debts')
@Index('IDX_staff_debts_source', ['company', 'source'], {
  unique: true,
  where: '"source" IS NOT NULL',
})
export class StaffDebt extends BaseEntity {
  @ManyToOne(() => Company, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'company_id',
    foreignKeyConstraintName: 'FK_staff_debts_company',
  })
  company!: Company;

  @Index('IDX_staff_debts_employee')
  @ManyToOne(() => Employee, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'employee_id',
    foreignKeyConstraintName: 'FK_staff_debts_employee',
  })
  employee!: Employee;

  @Column({
    type: 'enum',
    enum: StaffDebtKindEnum,
    enumName: 'staff_debts_kind_enum',
  })
  kind!: StaffDebtKindEnum;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount!: number;

  // The day it happened.
  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  // What it came from (a count, a payment, an expense), so it is charged once.
  @Column({ type: 'varchar', length: 120, nullable: true })
  source!: string | null;

  // Who charged it.
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_staff_debts_user',
  })
  user!: User | null;
}
