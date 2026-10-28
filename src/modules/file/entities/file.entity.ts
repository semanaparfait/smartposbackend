import { BaseEntity } from 'src/common/entities/base.entity';
import { Employee } from 'src/modules/employee/entities/employee.entity';
import { ProductCategory } from 'src/modules/product/entities/product-category.entity';
import { Product } from 'src/modules/product/entities/product.entity';
import { User } from 'src/modules/user/entities/user.entity';
import {
  AfterInsert,
  AfterLoad,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
} from 'typeorm';

export enum FileType {
  IMAGE = 'image',
  VIDEO = 'video',
  RAW = 'raw',
  AUTO = 'auto',
}

// Inserts a Cloudinary transformation into an upload URL (always over https).
function deliveryUrl(originalUrl: string, transformation: string) {
  if (!originalUrl) return originalUrl;

  return originalUrl
    .replace(/^http:\/\//, 'https://')
    .replace('/upload/', `/upload/${transformation}/`);
}

@Entity('files')
export class File extends BaseEntity {
  @Column()
  name!: string;

  // Link to the stored original. Clients should use `url` / `thumbnailUrl` instead.
  @Column({ name: 'url' })
  originalUrl!: string;

  // Optimized delivery links, built on load (not stored): Cloudinary picks the best
  // format for the browser (WebP/AVIF), compresses, and never scales up.
  url!: string;
  thumbnailUrl!: string;

  @AfterLoad()
  @AfterInsert()
  buildDeliveryUrls() {
    this.url = deliveryUrl(this.originalUrl, 'f_auto,q_auto,c_limit,w_1200');
    this.thumbnailUrl = deliveryUrl(
      this.originalUrl,
      'f_auto,q_auto,c_limit,w_300',
    );
  }

  @Column({ type: 'enum', enum: FileType })
  type!: FileType;

  @Column({ name: 'mime_type' })
  mimeType!: string;

  @Column('int')
  size!: number;

  @Index('IDX_files_product')
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

  // Profile picture of a user without an employee record (owner, super admin).
  @OneToOne(() => User, (user) => user.avatar, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_files_user' })
  user!: User;
}
