import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EmployeeModule } from './modules/employee/employee.module';
import { CompanyModule } from './modules/company/company.module';
import { UserModule } from './modules/user/user.module';
import { ConfigModule } from '@nestjs/config';
import { DeviceModule } from './modules/device/device.module';
import { ProductModule } from './modules/product/product.module';
import { ItemModule } from './modules/item/item.module';
import { CartModule } from './modules/cart/cart.module';
import { OrderModule } from './modules/order/order.module';
import { SeatModule } from './modules/seat/seat.module';
import { RoomModule } from './modules/room/room.module';
import { FloorMapModule } from './modules/floor-map/floor-map.module';
import serverConfig from './config/server.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseConfig from './config/database.config';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionFilter } from './common/filter/all.exceptions.filter';
import { LoggerService } from './common/logger/logger.service';
import { SeederModule } from './database/seeder/seeder.module';
import { FileModule } from './modules/file/file.module';
import cloudinaryConfig from './config/cloudinary.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [serverConfig, cloudinaryConfig],
    }),
    TypeOrmModule.forRootAsync(databaseConfig.asProvider()),
    SeederModule,

    UserModule,
    CompanyModule,
    DeviceModule,
    EmployeeModule,
    FloorMapModule,
    RoomModule,
    SeatModule,
    ProductModule,
    CartModule,
    ItemModule,
    OrderModule,
    FileModule,
  ],
  // controllers: [AppController],
  providers: [
    LoggerService,
    { provide: APP_FILTER, useClass: AllExceptionFilter },
    AppService,
  ],
})
export class AppModule {}
