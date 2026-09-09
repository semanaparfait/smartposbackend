import { BaseEntity } from 'src/common/entities/base.entity';
import { Device } from 'src/modules/device/entities/device.entity';
import { Employee } from 'src/modules/employee/entities/employee.entity';
import { EmployeeRole } from 'src/modules/employee/entities/employee-role.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { BeforeInsert, Column, Entity, OneToMany } from 'typeorm';
import { FloorMap } from 'src/modules/floor-map/entities/floor-map.entity';

export enum CompanyType {
  RESTAURANT = 'RESTAURANT',
  BAR = 'BAR',
  HOTEL = 'HOTEL',
  SUPERMARKET = 'SUPERMARKET',
  PHARMACY = 'PHARMACY',
  SHOP = 'SHOP',
}

@Entity('companies')
export class Company extends BaseEntity {
  @Column({ unique: true })
  code!: string;

  @Column({ nullable: true })
  logo!: string;

  @Column()
  name!: string;

  @Column()
  email!: string;

  @Column()
  phone_number!: string;

  @Column()
  location!: string;

  @Column({ type: 'enum', enum: CompanyType })
  type!: CompanyType;

  @OneToMany(() => Employee, (employee) => employee.company)
  employees!: Employee[];

  @OneToMany(() => User, (user) => user.company)
  users!: User[];

  @OneToMany(() => EmployeeRole, (roles) => roles.company)
  roles!: EmployeeRole[];

  @OneToMany(() => Device, (device) => device.company)
  devices!: Device[];

  @OneToMany(() => FloorMap, (floorMaps) => floorMaps.company)
  floorMaps!: FloorMap[];

  @BeforeInsert()
  generateCode() {
    if (!this.code) {
      this.code = Math.random().toString(36).substring(2, 8).toUpperCase();
    }
  }
}
