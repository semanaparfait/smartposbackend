import { BaseEntity } from 'src/common/entities/base.entity';
import { Company } from 'src/modules/company/entities/company.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { ServiceUnit } from './service-unit.entity';

// What kind of thing is offered; decides the wording and the usual price unit.
export enum ServiceKindEnum {
  ROOM = 'ROOM', // Hotel or guest rooms
  SPACE = 'SPACE', // Halls, meeting rooms, VIP areas, gardens
  ACTIVITY = 'ACTIVITY', // Pool table, gym, karaoke, car wash, salon chair
  TICKET = 'TICKET', // Entry fees and event tickets
  RENTAL = 'RENTAL', // Bikes, cars, equipment
  OTHER = 'OTHER',
}

// What the price is for. Hours, nights and days are measured from the times.
export enum PriceUnitEnum {
  HOUR = 'HOUR',
  NIGHT = 'NIGHT',
  DAY = 'DAY',
  SESSION = 'SESSION',
  PERSON = 'PERSON',
  FIXED = 'FIXED',
}

// Something the company sells by time or by booking rather than off a shelf.
@Entity('services')
export class ServiceOffering extends BaseEntity {
  @Index('IDX_services_company')
  @ManyToOne(() => Company, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'company_id',
    foreignKeyConstraintName: 'FK_services_company',
  })
  company!: Company;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'image_url', type: 'varchar', nullable: true })
  imageUrl!: string | null;

  @Column({
    type: 'enum',
    enum: ServiceKindEnum,
    enumName: 'services_kind_enum',
  })
  kind!: ServiceKindEnum;

  @Column({
    name: 'price_unit',
    type: 'enum',
    enum: PriceUnitEnum,
    enumName: 'services_price_unit_enum',
  })
  priceUnit!: PriceUnitEnum;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price!: number;

  // Most people one booking can take; null = no limit.
  @Column({ type: 'int', nullable: true })
  capacity!: number | null;

  // Suggested amount to take up front when booking ahead.
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  deposit!: number;

  @Column({ default: true })
  active!: boolean;

  @OneToMany(() => ServiceUnit, (unit) => unit.service)
  units!: ServiceUnit[];
}
