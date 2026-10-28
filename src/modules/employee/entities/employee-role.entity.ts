import { BaseEntity } from 'src/common/entities/base.entity';
import { Company } from 'src/modules/company/entities/company.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Employee } from './employee.entity';

@Entity('employee_roles')
export class EmployeeRole extends BaseEntity {
  @Column()
  name!: string;

  @Column({ nullable: true })
  description!: string;

  // Permission keys (see common/permissions). null = saved before permissions
  // existed, and allows everything; [] allows nothing.
  @Column({ type: 'text', array: true, nullable: true })
  permissions!: string[] | null;

  @ManyToOne(() => Company, (company) => company.roles)
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @OneToMany(() => Employee, (employee) => employee.role)
  employees!: Employee[];
}
