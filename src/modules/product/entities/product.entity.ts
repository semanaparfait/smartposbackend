import { BaseEntity } from 'src/common/entities/base.entity';
import {
  Column,
  Entity,
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
export class Product extends BaseEntity {
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

  @Column({ name: 'bar_code', nullable: true })
  barCode!: string;

  @Column({ type: 'text', nullable: true })
  ingredients!: string;

  @Column({ default: true })
  active!: boolean;

  @OneToMany(() => Item, (item) => item.product)
  items!: Item[];
}
