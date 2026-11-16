import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { ProductModule } from '../product/product.module';
import { DeliveryService } from './delivery.service';
import { DeliveryController } from './delivery.controller';
import { DeliveryPageController } from './delivery-page.controller';
import { DeliveryPin } from './entities/delivery-pin.entity';
import { FileModule } from '../file/file.module';
import { SmsService } from './sms.service';
import { KitchenStaffService } from './kitchen-staff.service';
import { LoginThrottleService } from 'src/util/login-throttle.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([Order, DeliveryPin]),
    ProductModule,
    FileModule,
  ],
  controllers: [OrderController, DeliveryController, DeliveryPageController],
  providers: [
    OrderService,
    DeliveryService,
    SmsService,
    KitchenStaffService,
    LoginThrottleService,
  ],
  exports: [OrderService, DeliveryService],
})
export class OrderModule {}
