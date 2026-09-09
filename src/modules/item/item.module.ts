import { forwardRef, Module } from '@nestjs/common';
import { ItemService } from './item.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Item } from './entities/item.entity';
import { CartModule } from '../cart/cart.module';
import { ProductModule } from '../product/product.module';
import { ItemController } from './item.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Item]),
    forwardRef(() => CartModule),
    ProductModule,
  ],
  controllers: [ItemController],
  providers: [ItemService],
  exports: [ItemService],
})
export class ItemModule {}
