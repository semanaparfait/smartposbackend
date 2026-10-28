import { BaseEntity } from 'src/common/entities/base.entity';
import { Company } from 'src/modules/company/entities/company.entity';
import { User } from 'src/modules/user/entities/user.entity';
import {
  AfterLoad,
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
import { effectivePermissions } from 'src/common/permissions/permissions';

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

  // Given on top of the role, for this employee only.
  @Column('text', { name: 'extra_permissions', array: true, default: '{}' })
  extraPermissions!: string[];

  // Taken away from what the role gives, for this employee only.
  @Column('text', { name: 'removed_permissions', array: true, default: '{}' })
  removedPermissions!: string[];

  // What the employee may do in the end (role + extra - removed); only set when
  // the role was loaded. null = everything.
  permissions?: string[] | null;

  @AfterLoad()
  computePermissions() {
    if (this.role === undefined) return;

    this.permissions = effectivePermissions(
      this.role ? this.role.permissions : undefined,
      this.extraPermissions,
      this.removedPermissions,
    );
  }
}
