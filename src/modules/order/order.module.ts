import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { ProductModule } from '../product/product.module';
import { DeliveryService } from './delivery.service';
import { DeliveryController } from './delivery.controller';
@Module({
  imports: [TypeOrmModule.forFeature([Order]), ProductModule],
  controllers: [OrderController, DeliveryController],
  providers: [OrderService, DeliveryService],
  exports: [OrderService, DeliveryService],
})
export class OrderModule {}
