import { BaseEntity } from 'src/common/entities/base.entity';
import { Item } from 'src/modules/item/entities/item.entity';
import { User } from 'src/modules/user/entities/user.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Company } from 'src/modules/company/entities/company.entity';
import { Payment } from './payment.entity';

export enum OrderStatusEnum {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  READY = 'READY',
  // Taken to the customer. Payment can still follow.
  SERVED = 'SERVED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum OrderTypeEnum {
  IN_STORE = 'IN_STORE',
  DELIVERY = 'DELIVERY',
}

// One station's part of an order. `items`: when the part started again for
// items added after it was served, only those item ids (the station sees just
// them); null = all the station's items on the order.
export type StationPartStatus = 'PENDING' | 'PREPARING' | 'READY' | 'SERVED';
export interface StationPart {
  status: StationPartStatus;
  items: string[] | null;
}
export type StationStatus = Record<string, StationPart>;

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number | null;
}

export interface DeliveryProof {
  method: 'CODE' | 'QR' | 'NO_CODE';
  // Metres from the customer's saved place, or from where the rider arrived.
  distanceM?: number | null;
  flags?: ('AWAY' | 'NO_GPS' | 'NO_CODE')[];
  photoUrl?: string | null;
  // Why there was no code.
  note?: string | null;
  // Who marked it delivered, so only they can add the photo.
  by?: string | null;
}

// Where a delivery order is; null for in-store orders.
export enum DeliveryStatusEnum {
  WAITING = 'WAITING', // not sent yet (may still be cooking)
  ON_THE_WAY = 'ON_THE_WAY',
  DELIVERED = 'DELIVERED',
  NOT_DELIVERED = 'NOT_DELIVERED',
}

// The kitchen's progress on a delivery paid before its food was ready (once paid,
// `status` is COMPLETED). null when nothing is left for the kitchen.
export enum KitchenStatusEnum {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
}

@Index('IDX_orders_company_created', ['company', 'createdAt'])
@Entity('orders')
export class Order extends BaseEntity {
  @ManyToOne(() => Company, (company) => company.orders, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'company_id',
    foreignKeyConstraintName: 'FK_orders_company',
  })
  company!: Company;

  @Column({ type: 'enum', enum: OrderStatusEnum })
  status!: OrderStatusEnum;

  @Column({
    type: 'decimal',
    scale: 2,
  })
  subtotal!: number;

  @Column({
    type: 'decimal',
    scale: 2,
  })
  tax!: number;

  @Column({
    type: 'decimal',
    scale: 2,
  })
  total!: number;

  @Column({ nullable: true })
  note!: string;

  // Where it is served, from the floor map: the table or seat ("T04", "S03"),
  // what it is ("Table", "Bar stool") and its area ("Restaurant"). Kept after
  // the table is free again, for receipts and history.
  @Column({ name: 'table_id', type: 'varchar', length: 64, nullable: true })
  tableId!: string | null;

  @Column({ name: 'table_name', type: 'varchar', length: 40, nullable: true })
  tableName!: string | null;

  @Column({ name: 'table_kind', type: 'varchar', length: 40, nullable: true })
  tableKind!: string | null;

  @Column({ name: 'table_area', type: 'varchar', length: 80, nullable: true })
  tableArea!: string | null;

  @OneToMany(() => Item, (items) => items.order)
  items!: Item[];

  @OneToMany(() => Payment, (payment) => payment.order)
  payments!: Payment[];

  @Column({
    type: 'enum',
    enum: OrderTypeEnum,
    default: OrderTypeEnum.IN_STORE,
  })
  type!: OrderTypeEnum;

  @Column({
    name: 'delivery_status',
    type: 'enum',
    enum: DeliveryStatusEnum,
    nullable: true,
  })
  deliveryStatus!: DeliveryStatusEnum | null;

  // Included in `total`.
  @Column({
    name: 'delivery_fee',
    type: 'decimal',
    scale: 2,
    default: 0,
  })
  deliveryFee!: number;

  @Column({
    name: 'customer_name',
    type: 'varchar',
    length: 80,
    nullable: true,
  })
  customerName!: string | null;

  @Column({
    name: 'customer_phone',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  customerPhone!: string | null;

  // Where to take it, as the worker typed it (street, landmark).
  @Column({ name: 'delivery_address', type: 'text', nullable: true })
  deliveryAddress!: string | null;

  // The owner's delivery area it went to, when areas are set.
  @Column({
    name: 'delivery_area',
    type: 'varchar',
    length: 60,
    nullable: true,
  })
  deliveryArea!: string | null;

  // One of the shop's riders...
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'rider_id', foreignKeyConstraintName: 'FK_orders_rider' })
  rider!: User | null;

  // ...or an outside service, as typed (e.g. "Moto - Eric 0788...").
  @Column({
    name: 'outside_rider',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  outsideRider!: string | null;

  // Paid when delivered rather than at the till.
  @Column({ name: 'pay_on_delivery', default: false })
  payOnDelivery!: boolean;

  // Who took the money at the door; their money check covers it.
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'collected_by_id',
    foreignKeyConstraintName: 'FK_orders_collected_by',
  })
  collectedBy!: User | null;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt!: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt!: Date | null;

  @Column({
    name: 'kitchen_status',
    type: 'enum',
    enum: KitchenStatusEnum,
    nullable: true,
  })
  kitchenStatus!: KitchenStatusEnum | null;

  // Each station's part, by station id. null when the company has no stations
  // or nothing goes to a station: `status` then works as it always did.
  @Column({ name: 'station_status', type: 'jsonb', nullable: true })
  stationStatus!: StationStatus | null;

  // Why it couldn't be delivered.
  @Column({ name: 'delivery_problem', type: 'text', nullable: true })
  deliveryProblem!: string | null;

  // ---- Delivery codes (company.deliveryCodes) ----
  // The customer gets a code and gives it to the rider once they have the
  // order. The code and the customer's page link are never loaded by default
  // (select: false): order responses and live events reach riders too. Only
  // DeliveryService adds them back, for the till and owner.

  @Column({ name: 'delivery_code_required', default: false })
  deliveryCodeRequired!: boolean;

  @Column({
    name: 'delivery_code',
    type: 'varchar',
    length: 8,
    nullable: true,
    select: false,
  })
  deliveryCode?: string | null;

  // Wrong codes entered; at MAX_CODE_TRIES the code stops working.
  @Column({ name: 'delivery_code_tries', type: 'int', default: 0 })
  deliveryCodeTries!: number;

  // The customer's page: /d/<token>.
  @Index('UQ_orders_delivery_track_token', { unique: true })
  @Column({
    name: 'delivery_track_token',
    type: 'varchar',
    length: 48,
    nullable: true,
    select: false,
  })
  deliveryTrackToken?: string | null;

  @Column({ name: 'notify_by', type: 'varchar', length: 10, nullable: true })
  notifyBy!: 'WHATSAPP' | 'SMS' | null;

  @Column({
    name: 'customer_language',
    type: 'varchar',
    length: 4,
    nullable: true,
  })
  customerLanguage!: 'en' | 'rw' | 'fr' | 'sw' | null;

  @Column({ name: 'code_sent_at', type: 'timestamptz', nullable: true })
  codeSentAt!: Date | null;

  @Column({ name: 'arrived_at', type: 'timestamptz', nullable: true })
  arrivedAt!: Date | null;

  // Where the rider said they arrived, and where it was confirmed. Kept out of
  // responses: only the distance and flags in deliveryProof are shown.
  @Column({
    name: 'arrived_position',
    type: 'jsonb',
    nullable: true,
    select: false,
  })
  arrivedPosition?: GeoPosition | null;

  @Column({
    name: 'delivered_position',
    type: 'jsonb',
    nullable: true,
    select: false,
  })
  deliveredPosition?: GeoPosition | null;

  // How it was confirmed: by code or QR, or without one (flagged).
  @Column({ name: 'delivery_proof', type: 'jsonb', nullable: true })
  deliveryProof!: DeliveryProof | null;

  @Index('IDX_orders_user')
  @ManyToOne(() => User, (user) => user.orders, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
