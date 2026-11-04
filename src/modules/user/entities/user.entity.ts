import { BaseEntity } from 'src/common/entities/base.entity';
import { Company } from 'src/modules/company/entities/company.entity';
import { Employee } from 'src/modules/employee/entities/employee.entity';
import { File } from 'src/modules/file/entities/file.entity';
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
  employee!: Employee | null;

  @ManyToOne(() => Company, (company) => company.users, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column()
  name!: string;

  @Column({ unique: true, nullable: true })
  email!: string;

  @Column({ nullable: true })
  phone!: string;

  // Hashes are never selected by default; use UserService.findWithSecrets when they are needed.
  @Column({ nullable: true, select: false })
  pin!: string;

  @Column({ select: false })
  password!: string;

  @Column({ type: 'enum', enum: UserRole })
  role!: UserRole;

  @Column({ default: true })
  active!: boolean;

  @Column({ default: true })
  mustChangePassword!: boolean;

  // The app's language for this person: en, rw, fr or sw.
  @Column({ type: 'varchar', length: 5, default: 'en' })
  language!: string;

  @Column({ nullable: true })
  lastLoginAt!: Date;

  // Employees only: when false, signing in on a device signs them out everywhere
  // else. Set by the owner.
  @Column({ name: 'allow_multiple_devices', default: false })
  allowMultipleDevices!: boolean;

  // The one session currently allowed (token `sid`) while multiple devices are
  // not allowed. Bookkeeping, never returned.
  @Column({
    name: 'session_id',
    type: 'varchar',
    nullable: true,
    select: false,
  })
  sessionId!: string | null;

  // Forgot password: the emailed 6-digit code (hashed), when it stops working,
  // and how many wrong tries were made. Bookkeeping, never returned.
  @Column({
    name: 'reset_code_hash',
    type: 'varchar',
    nullable: true,
    select: false,
  })
  resetCodeHash!: string | null;

  @Column({
    name: 'reset_code_expires_at',
    type: 'timestamptz',
    nullable: true,
    select: false,
  })
  resetCodeExpiresAt!: Date | null;

  @Column({ name: 'reset_attempts', type: 'int', default: 0, select: false })
  resetAttempts!: number;

  @OneToMany(() => Order, (orders) => orders.user)
  orders!: Order[];

  // Employees' pictures live on their employee record (`employee.profile`).
  @OneToOne(() => File, (file) => file.user)
  avatar!: File;
}
