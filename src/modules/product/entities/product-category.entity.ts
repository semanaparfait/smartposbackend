import { BaseEntity } from 'src/common/entities/base.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  Unique,
} from 'typeorm';
import { Company } from 'src/modules/company/entities/company.entity';
import { Product } from './product.entity';
import { File } from 'src/modules/file/entities/file.entity';

@Entity('product_categories')
@Unique('UQ_CATEGORY_COMPANY_NAME', ['company', 'name'])
export class ProductCategory extends BaseEntity {
  @ManyToOne(() => Company, (company) => company.categories, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'company_id',
    foreignKeyConstraintName: 'FK_product_categories_company',
  })
  company!: Company;

  @OneToOne(() => File, (image) => image.category)
  image!: File;

  @Column()
  name!: string;

  @OneToMany(() => Product, (product) => product.category)
  products!: Product[];
}
