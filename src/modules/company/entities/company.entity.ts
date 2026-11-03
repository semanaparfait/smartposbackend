import { BaseEntity } from 'src/common/entities/base.entity';
import { Device } from 'src/modules/device/entities/device.entity';
import { Employee } from 'src/modules/employee/entities/employee.entity';
import { EmployeeRole } from 'src/modules/employee/entities/employee-role.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { BeforeInsert, Column, Entity, OneToMany } from 'typeorm';
import { FloorMap } from 'src/modules/floor-map/entities/floor-map.entity';
import { ProductCategory } from 'src/modules/product/entities/product-category.entity';
import { Product } from 'src/modules/product/entities/product.entity';
import { RoomType } from 'src/modules/room/entities/room-type.entity';
import { Cart } from 'src/modules/cart/entities/cart.entity';
import { Order } from 'src/modules/order/entities/order.entity';

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

  // Tax number, printed on receipts.
  @Column({ type: 'varchar', length: 20, nullable: true })
  tin!: string | null;

  @Column({ type: 'enum', enum: CompanyType })
  type!: CompanyType;

  // Longest a sale may stay on hold, set by the owner.
  @Column({ name: 'max_hold_minutes', type: 'int', default: 60 })
  maxHoldMinutes!: number;

  // Off until the owner turns it on.
  @Column({ name: 'delivery_enabled', default: false })
  deliveryEnabled!: boolean;

  // Fee for every delivery, used when no areas are set.
  @Column({ name: 'delivery_fee', type: 'decimal', scale: 2, default: 0 })
  deliveryFee!: number;

  // Areas with their own fee, e.g. [{ name: 'Remera', fee: 1500 }].
  @Column({ name: 'delivery_areas', type: 'jsonb', default: [] })
  deliveryAreas!: { name: string; fee: number }[];

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

  @OneToMany(() => ProductCategory, (category) => category.company)
  categories!: ProductCategory[];

  @OneToMany(() => Product, (product) => product.company)
  products!: Product[];

  @OneToMany(() => RoomType, (roomType) => roomType.company)
  roomTypes!: RoomType[];

  @OneToMany(() => Cart, (cart) => cart.company)
  carts!: Cart[];

  @OneToMany(() => Order, (order) => order.company)
  orders!: Order[];

  @BeforeInsert()
  generateCode() {
    if (!this.code) {
      this.code = Math.random().toString(36).substring(2, 8).toUpperCase();
    }
  }
}
