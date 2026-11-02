import { BaseEntity } from 'src/common/entities/base.entity';
import { Company } from 'src/modules/company/entities/company.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

export enum ExpenseCategoryEnum {
  RENT = 'RENT',
  ELECTRICITY = 'ELECTRICITY',
  WATER = 'WATER',
  INTERNET = 'INTERNET',
  WAGES = 'WAGES', // People paid outside Workers (their salaries count by themselves)
  TRANSPORT = 'TRANSPORT',
  SUPPLIES = 'SUPPLIES',
  MAINTENANCE = 'MAINTENANCE',
  TAX = 'TAX',
  MARKETING = 'MARKETING',
  OTHER = 'OTHER',
}

// How often the amount is paid. Repeating costs are spread over the days they
// cover, so a day's profit carries its share of the month's rent.
export enum ExpenseRepeatEnum {
  ONCE = 'ONCE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export enum ExpenseStatusEnum {
  APPROVED = 'APPROVED',
  PENDING = 'PENDING',
  REJECTED = 'REJECTED',
}

// Where the money came from. Till money lowers what the worker's drawer
// should hold; their own money is owed back to them.
export enum ExpensePaidFromEnum {
  TILL_CASH = 'TILL_CASH',
  TILL_MOMO = 'TILL_MOMO',
  OWN_MONEY = 'OWN_MONEY',
  OTHER = 'OTHER',
}

// How the company paid a worker back.
export enum RepaidWithEnum {
  CASH = 'CASH',
  MOMO = 'MOMO',
  BANK = 'BANK',
}

// Money the company spends to run: bills, rent, supplies.
@Entity('expenses')
export class Expense extends BaseEntity {
  @Index('IDX_expenses_company')
  @ManyToOne(() => Company, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'company_id',
    foreignKeyConstraintName: 'FK_expenses_company',
  })
  company!: Company;

  @Column({ type: 'varchar', length: 120 })
  title!: string;

  @Column({
    type: 'enum',
    enum: ExpenseCategoryEnum,
    enumName: 'expenses_category_enum',
  })
  category!: ExpenseCategoryEnum;

  // Paid each time: once, or per day, week, month or year.
  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount!: number;

  @Column({
    type: 'enum',
    enum: ExpenseRepeatEnum,
    enumName: 'expenses_repeat_enum',
    default: ExpenseRepeatEnum.ONCE,
  })
  repeat!: ExpenseRepeatEnum;

  // The day it was paid (once), or the first day it covers (repeating).
  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  // Last day a repeating cost applies; null = still going.
  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  // Who recorded it (for a submission, the worker who paid).
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_expenses_user' })
  user!: User | null;

  // Recorded by someone who manages expenses: approved at once. Submitted by a
  // worker: waits for approval, and only then counts against the profit.
  @Column({
    type: 'enum',
    enum: ExpenseStatusEnum,
    enumName: 'expenses_status_enum',
    default: ExpenseStatusEnum.APPROVED,
  })
  status!: ExpenseStatusEnum;

  @Column({
    name: 'paid_from',
    type: 'enum',
    enum: ExpensePaidFromEnum,
    enumName: 'expenses_paid_from_enum',
    nullable: true,
  })
  paidFrom!: ExpensePaidFromEnum | null;

  // Photo of the receipt or bill.
  @Column({ name: 'proof_url', type: 'varchar', nullable: true })
  proofUrl!: string | null;

  // Why it was rejected (or a remark on approval).
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
    foreignKeyConstraintName: 'FK_expenses_reviewed_by',
  })
  reviewedBy!: User | null;

  // Paid with the worker's own money: when the company paid it back.
  @Column({ name: 'repaid_at', type: 'timestamptz', nullable: true })
  repaidAt!: Date | null;

  @Column({
    name: 'repaid_with',
    type: 'enum',
    enum: RepaidWithEnum,
    enumName: 'expenses_repaid_with_enum',
    nullable: true,
  })
  repaidWith!: RepaidWithEnum | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'repaid_by_id',
    foreignKeyConstraintName: 'FK_expenses_repaid_by',
  })
  repaidBy!: User | null;
}
