import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Company } from '../company/entities/company.entity';

// The owner's floor map (floors, rooms, walls, tables), as the app draws it.
// One per company; the app's map editor owns the shape of `layout`.
@Entity('venue_layouts')
@Index('UQ_venue_layouts_company', ['company'], { unique: true })
export class VenueLayout extends BaseEntity {
  @ManyToOne(() => Company, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'company_id',
    foreignKeyConstraintName: 'FK_venue_layouts_company',
  })
  company!: Company;

  @Column({ type: 'jsonb' })
  layout!: Record<string, unknown>;

  // Goes up on every save, so two owners editing at once don't overwrite
  // each other without knowing.
  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({
    name: 'saved_by_name',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  savedByName!: string | null;
}

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning';
export const TABLE_STATUSES: TableStatus[] = [
  'available',
  'occupied',
  'reserved',
  'cleaning',
];

export interface TableBooking {
  name: string;
  phone?: string | null;
  // When the guests are expected (ISO time).
  at: string;
  guests?: number | null;
  note?: string | null;
}

// What is happening at one table right now, shared by every worker.
// `tableId` is the table's id in the layout.
@Entity('venue_tables')
@Index('UQ_venue_tables_company_table', ['company', 'tableId'], {
  unique: true,
})
export class VenueTable extends BaseEntity {
  @ManyToOne(() => Company, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'company_id',
    foreignKeyConstraintName: 'FK_venue_tables_company',
  })
  company!: Company;

  @Column({ name: 'table_id', type: 'varchar', length: 64 })
  tableId!: string;

  @Column({ type: 'varchar', length: 16, default: 'available' })
  status!: TableStatus;

  // The order being served at this table.
  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  booking!: TableBooking | null;

  @Column({ type: 'timestamptz' })
  since!: Date;

  @Column({ name: 'served_by_id', type: 'uuid', nullable: true })
  servedById!: string | null;

  @Column({
    name: 'served_by_name',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  servedByName!: string | null;
}
