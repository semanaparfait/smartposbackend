import { BaseEntity } from 'src/common/entities/base.entity';
import { Company } from 'src/modules/company/entities/company.entity';
import { User } from 'src/modules/user/entities/user.entity';
import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  Unique,
} from 'typeorm';
import { EmployeeRole } from './employee-role.entity';
import { File } from 'src/modules/file/entities/file.entity';

export enum ShiftType {
  DAY = 'DAY',
  EVENING = 'EVENING',
  NIGHT = 'NIGHT',
  HYBRID = 'HYBRID',
}

@Entity('employees')
@Unique('UQ_EMPLOYEE_COMPANY_EMAIL', ['company', 'email'])
@Unique('UQ_EMPLOYEE_COMPANY_PHONE', ['company', 'phone'])
@Check(`("email" IS NOT NULL OR "phone" IS NOT NULL)`)
export class Employee extends BaseEntity {
  @OneToOne(() => File, (profile) => profile.employee)
  profile!: File;

  @Column()
  name!: string;

  @Column({ nullable: true })
  email!: string;

  @Column({ nullable: true })
  phone!: string;

  @Column()
  salary!: number;

  @ManyToOne(() => EmployeeRole, (role) => role.employees)
  @JoinColumn({ name: 'role_id' })
  role!: EmployeeRole;

  @Column({ type: 'enum', enum: ShiftType })
  shift!: ShiftType;

  @OneToOne(() => User, (user) => user.employee)
  user!: User;

  @ManyToOne(() => Company, (company) => company.employees)
  @JoinColumn({ name: 'company_id' })
  company!: Company;
}
