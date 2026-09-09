import { BaseEntity } from 'src/common/entities/base.entity';
import { Employee } from 'src/modules/employee/entities/employee.entity';
import { ProductCategory } from 'src/modules/product/entities/product-category.entity';
import { Product } from 'src/modules/product/entities/product.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';

export enum FileType {
  IMAGE = 'image',
  VIDEO = 'video',
  RAW = 'raw',
  AUTO = 'auto',
}

@Entity('files')
export class File extends BaseEntity {
  @Column()
  name!: string;

  @Column()
  url!: string;

  @Column({ type: 'enum', enum: FileType })
  type!: FileType;

  @Column({ name: 'mime_type' })
  mimeType!: string;

  @Column('int')
  size!: number;

  @ManyToOne(() => Product, (product) => product.images, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @OneToOne(() => ProductCategory, (category) => category.image, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'category_id' })
  category!: ProductCategory;

  @OneToOne(() => Employee, (employee) => employee.profile, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee;
}
