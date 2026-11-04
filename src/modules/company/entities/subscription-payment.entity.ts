import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Company } from './company.entity';

// Money a company paid SmartPOS for its subscription, recorded by the super admin.
@Entity('subscription_payments')
@Index('IDX_subscription_payments_company', ['company', 'paidOn'])
export class SubscriptionPayment extends BaseEntity {
  @ManyToOne(() => Company, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'company_id',
    foreignKeyConstraintName: 'FK_subscription_payments_company',
  })
  company!: Company;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount!: string;

  // How many months it pays for.
  @Column({ type: 'int' })
  months!: number;

  @Column({ type: 'varchar', length: 20 })
  method!: string;

  @Column({ name: 'paid_on', type: 'date' })
  paidOn!: string;

  // The days it pays for, worked out from the payments before it.
  @Column({ name: 'covers_from', type: 'date' })
  coversFrom!: string;

  @Column({ name: 'covers_to', type: 'date' })
  coversTo!: string;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({
    name: 'recorded_by_name',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  recordedByName!: string | null;
}
