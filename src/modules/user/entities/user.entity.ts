import { BaseEntity } from 'src/common/entities/base.entity';
import { Company } from 'src/modules/company/entities/company.entity';
import { Employee } from 'src/modules/employee/entities/employee.entity';
import { Order } from 'src/modules/order/entities/order.entity';
import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  Unique,
} from 'typeorm';

export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
  EMPLOYEE = 'EMPLOYEE',
}

@Entity('users')
@Unique('UQ_USER_COMPANY_EMAIL', ['company', 'email'])
@Unique('UQ_USER_COMPANY_PHONE', ['company', 'phone'])
@Check(`("email" IS NOT NULL OR "phone" IS NOT NULL)`)
export class User extends BaseEntity {
  @OneToOne(() => Employee, (employee) => employee.user, { nullable: true })
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee;

  @ManyToOne(() => Company, (company) => company.users, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column()
  name!: string;

  @Column({ nullable: true })
  email!: string;

  @Column({ nullable: true })
  phone!: string;

  @Column({ nullable: true })
  pin!: string;

  @Column()
  password!: string;

  @Column({ type: 'enum', enum: UserRole })
  role!: UserRole;

  @Column({ default: true })
  active!: boolean;

  @Column({ default: true })
  mustChangePassword!: boolean;

  @Column({ nullable: true })
  lastLoginAt!: Date;

  @OneToMany(() => Order, (orders) => orders.user)
  orders!: Order[];
}
