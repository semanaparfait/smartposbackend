import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Product } from './product.entity';

// How much of an ingredient one unit of a product uses, in the ingredient's unit.
@Entity('recipe_items')
@Unique('UQ_RECIPE_ITEM', ['product', 'ingredient'])
export class RecipeItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Product, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Index('IDX_recipe_items_ingredient')
  @ManyToOne(() => Product, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ingredient_id' })
  ingredient!: Product;

  @Column({ type: 'decimal', precision: 12, scale: 3 })
  quantity!: number;
}
