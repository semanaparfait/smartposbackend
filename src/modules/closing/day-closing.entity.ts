import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Company } from '../company/entities/company.entity';

export type Method = 'CASH' | 'MOMO' | 'CARD' | 'CREDIT';
export type MoneyByMethod = Record<Method, number>;

export interface ClosingMoney {
  // What the tills say should be there, by payment method.
  expected: MoneyByMethod;
  // What was counted at closing (credit isn't counted: it is owed).
  counted: Omit<MoneyByMethod, 'CREDIT'>;
  // Counted minus expected, cash + MoMo + card; below zero is money missing.
  difference: number;
  // Where the expected cash came from.
  sales: number;
  services: number;
  tillExpenses: number;
}

export interface ClosingOrders {
  paid: number;
  paidTotal: number;
  cancelled: number;
}

export interface ClosingStockRow {
  productId: string;
  name: string;
  unit: string;
  opening: number;
  received: number;
  sold: number;
  wasted: number;
  adjusted: number;
  expected: number;
  // null: not counted (the system's number is kept).
  counted: number | null;
  difference: number;
  // What the difference is worth at buying price.
  value: number;
}

// The end of a business day: the money and stock checked, and the summary
// owners get on their phone and WhatsApp.
@Entity('day_closings')
@Index('IDX_day_closings_company_closed', ['company', 'closedAt'])
export class DayClosing extends BaseEntity {
  @ManyToOne(() => Company, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'company_id',
    foreignKeyConstraintName: 'FK_day_closings_company',
  })
  company!: Company;

  // The day it is for (Kigali time) and the stretch it covers.
  @Column({ name: 'business_day', type: 'date' })
  businessDay!: string;

  @Column({ name: 'opened_at', type: 'timestamptz' })
  openedAt!: Date;

  @Column({ name: 'closed_at', type: 'timestamptz' })
  closedAt!: Date;

  @Column({ name: 'closed_by_id', type: 'uuid', nullable: true })
  closedById!: string | null;

  @Column({ name: 'closed_by_name', type: 'varchar', length: 120 })
  closedByName!: string;

  @Column({ type: 'jsonb' })
  money!: ClosingMoney;

  @Column({ type: 'jsonb' })
  orders!: ClosingOrders;

  @Column({ type: 'jsonb' })
  stock!: ClosingStockRow[];

  @Column({ type: 'text', nullable: true })
  note!: string | null;
}
