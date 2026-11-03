import { BaseEntity } from 'src/common/entities/base.entity';
import { Company } from 'src/modules/company/entities/company.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

export enum MoneyCheckStatusEnum {
  VERIFIED = 'VERIFIED',
  FLAGGED = 'FLAGGED',
}

// Someone with finance.verify counted one worker's takings for one day. Saved
// here so the owner and every device see the same checks.
@Index('IDX_money_checks_company_date_worker', ['company', 'date', 'worker'], {
  unique: true,
})
@Entity('money_checks')
export class MoneyCheck extends BaseEntity {
  @ManyToOne(() => Company, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'company_id',
    foreignKeyConstraintName: 'FK_money_checks_company',
  })
  company!: Company;

  // The local day the money was taken, YYYY-MM-DD.
  @Column({ type: 'date' })
  date!: string;

  // Whose takings were counted.
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'worker_id',
    foreignKeyConstraintName: 'FK_money_checks_worker',
  })
  worker!: User;

  @Column({ type: 'enum', enum: MoneyCheckStatusEnum })
  status!: MoneyCheckStatusEnum;

  // Amounts by payment method, e.g. { CASH: 12000, MOMO: 5000 }.
  @Column({ type: 'jsonb', default: {} })
  counted!: Record<string, number>;

  @Column({ type: 'jsonb', default: {} })
  expected!: Record<string, number>;

  // Counted minus expected: below zero is money missing.
  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  difference!: number;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ name: 'decided_at', type: 'timestamptz' })
  decidedAt!: Date;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'decided_by_id',
    foreignKeyConstraintName: 'FK_money_checks_decided_by',
  })
  decidedBy!: User | null;

  // Kept as text too, so the name survives if that account is removed.
  @Column({ name: 'decided_by_name', type: 'varchar', length: 120 })
  decidedByName!: string;
}
