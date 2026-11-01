import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductCategory } from './entities/product-category.entity';
import { Product } from './entities/product.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { StockService } from './stock.service';
import { FileModule } from '../file/file.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductCategory, Product, StockMovement]),
    FileModule,
  ],
  controllers: [ProductController],
  providers: [ProductService, StockService],
  exports: [ProductService, StockService],
})
export class ProductModule {}
