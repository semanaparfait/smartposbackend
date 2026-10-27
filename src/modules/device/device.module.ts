import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DeviceService } from './device.service';
import { DeviceController } from './device.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Device } from './entities/device.entity';
import { DeviceActivity } from './entities/device-activity.entity';
import { CompanyModule } from '../company/company.module';
import { DeviceActivityInterceptor } from './device-activity.interceptor';
import { LoggerService } from 'src/common/logger/logger.service';

@Module({
  imports: [TypeOrmModule.forFeature([Device, DeviceActivity]), CompanyModule],
  controllers: [DeviceController],
  providers: [
    DeviceService,
    LoggerService,
    { provide: APP_INTERCEPTOR, useClass: DeviceActivityInterceptor },
  ],
  exports: [DeviceService],
})
export class DeviceModule {}
