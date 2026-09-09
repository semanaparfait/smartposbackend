import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, OneToMany, OneToOne } from 'typeorm';
import { Product } from './product.entity';
import { File } from 'src/modules/file/entities/file.entity';

@Entity('product_categories')
export class ProductCategory extends BaseEntity {
  @OneToOne(() => File, (image) => image.category)
  image!: File;

  @Column({ unique: true })
  name!: string;

  @OneToMany(() => Product, (product) => product.category)
  products!: Product[];
}
