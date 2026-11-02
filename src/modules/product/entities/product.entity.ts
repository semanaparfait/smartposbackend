import { BaseEntity } from 'src/common/entities/base.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Unique,
} from 'typeorm';
import { Company } from 'src/modules/company/entities/company.entity';
import { ProductCategory } from './product-category.entity';
import { Item } from 'src/modules/item/entities/item.entity';
import { File } from 'src/modules/file/entities/file.entity';

@Entity('products')
@Unique('UQ_PRODUCT_COMPANY_NAME', ['company', 'name'])
@Unique('UQ_PRODUCT_COMPANY_BARCODE', ['company', 'barCode'])
@Unique('UQ_PRODUCT_COMPANY_SKU', ['company', 'sku'])
export class Product extends BaseEntity {
  @Index('IDX_products_company')
  @ManyToOne(() => Company, (company) => company.products, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'company_id',
    foreignKeyConstraintName: 'FK_products_company',
  })
  company!: Company;

  @ManyToOne(() => ProductCategory, (category) => category.products, {
    nullable: true,
  })
  @JoinColumn({ name: 'category_id' })
  category!: ProductCategory;

  @OneToMany(() => File, (img) => img.product)
  images!: File[];

  @Column()
  name!: string;

  @Column({ name: 'buying_price', type: 'decimal', scale: 2 })
  buyingPrice!: number;

  @Column({ name: 'selling_price', type: 'decimal', scale: 2 })
  sellingPrice!: number;

  @Column({ name: 'bar_code', type: 'varchar', nullable: true })
  barCode!: string | null;

  @Column({ type: 'text', nullable: true })
  ingredients!: string;

  @Column({ default: true })
  active!: boolean;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', nullable: true })
  sku!: string | null;

  @Column({ type: 'varchar', nullable: true })
  supplier!: string | null;

  // Free text (see the app's unit list); a shop may type its own.
  @Column({ type: 'varchar', length: 20, default: 'Piece' })
  unit!: string;

  // How it is bought, when that differs from `unit`: a Tray of 30 eggs counted in
  // Piece. Stock and recipes stay in `unit`.
  @Column({ name: 'purchase_unit', type: 'varchar', length: 20, nullable: true })
  purchaseUnit!: string | null;

  @Column({
    name: 'purchase_size',
    type: 'decimal',
    precision: 12,
    scale: 3,
    nullable: true,
  })
  purchaseSize!: number | null;

  // Off by default: the product sells without any stock being counted.
  @Column({ name: 'track_stock', default: false })
  trackStock!: boolean;

  // Decimal so amounts like 1.5 kg fit. Only changed through StockService, so
  // every change has a stock movement; a sale can take it below zero.
  @Column({
    name: 'stock_quantity',
    type: 'decimal',
    precision: 12,
    scale: 3,
    default: 0,
  })
  stockQuantity!: number;

  @Column({
    name: 'low_stock_level',
    type: 'decimal',
    precision: 12,
    scale: 3,
    nullable: true,
  })
  lowStockLevel!: number | null;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate!: string | null;

  @Column({ name: 'send_to_kitchen', default: false })
  sendToKitchen!: boolean;

  // Stock used to make other products; never sold on its own.
  @Column({ name: 'is_ingredient', default: false })
  isIngredient!: boolean;

  @OneToMany(() => Item, (item) => item.product)
  items!: Item[];

  // Not stored: how many can be made from current stock. Null when it doesn't
  // depend on stock, i.e. no recipe, or no stock-tracked ingredients in it.
  canMake?: number | null;
}
