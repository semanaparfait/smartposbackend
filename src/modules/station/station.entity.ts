import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { Company } from 'src/modules/company/entities/company.entity';

// A place that prepares part of an order, with its own kitchen screen: the
// kitchen, the bar, the grill. Categories (or single products) say which
// station makes them; each kitchen display shows one station, or all of them.
// A company without stations works as before: one kitchen for everything.
@Entity('stations')
@Unique('UQ_stations_company_name', ['company', 'name'])
export class Station extends BaseEntity {
  @Index('IDX_stations_company')
  @ManyToOne(() => Company, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'company_id',
    foreignKeyConstraintName: 'FK_stations_company',
  })
  company!: Company;

  @Column({ type: 'varchar', length: 40 })
  name!: string;

  // Order on screens and lists. The first station also gets kitchen items whose
  // category has no station.
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;
}
