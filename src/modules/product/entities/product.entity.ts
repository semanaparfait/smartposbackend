import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { ProductCategory } from './product-category.entity';
import { Item } from 'src/modules/item/entities/item.entity';
import { File } from 'src/modules/file/entities/file.entity';

@Entity('products')
export class Product extends BaseEntity {
  @ManyToOne(() => ProductCategory, (category) => category.products, {
    nullable: true,
  })
  @JoinColumn({ name: 'category_id' })
  category!: ProductCategory;

  @OneToMany(() => File, (img) => img.product)
  images!: File[];

  @Column({ unique: true })
  name!: string;

  @Column({ name: 'buying_price', type: 'decimal', scale: 2 })
  buyingPrice!: number;

  @Column({ name: 'selling_price', type: 'decimal', scale: 2 })
  sellingPrice!: number;

  @Column({ name: 'bar_code', unique: true, nullable: true })
  barCode!: string;

  @Column({ type: 'text', nullable: true })
  ingredients!: string;

  @Column({ default: true })
  active!: boolean;

  @OneToMany(() => Item, (item) => item.product)
  items!: Item[];
}
