import { BaseEntity } from 'src/common/entities/base.entity';
import { Company } from 'src/modules/company/entities/company.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

// Where a customer (by phone number) gets their deliveries: saved from the
// first delivery confirmed with the right code near where the rider arrived.
// Later deliveries confirmed far from it are flagged for the owner.
@Index('UQ_delivery_pins_company_phone', ['company', 'phone'], { unique: true })
@Entity('delivery_pins')
export class DeliveryPin extends BaseEntity {
  @ManyToOne(() => Company, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'company_id',
    foreignKeyConstraintName: 'FK_delivery_pins_company',
  })
  company!: Company;

  // International form, digits only: 250788123456.
  @Column({ type: 'varchar', length: 20 })
  phone!: string;

  @Column({ type: 'double precision' })
  lat!: number;

  @Column({ type: 'double precision' })
  lng!: number;
}
