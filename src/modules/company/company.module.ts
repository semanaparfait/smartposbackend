import { Module } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './entities/company.entity';
import { DeviceActivity } from '../device/entities/device-activity.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { Order } from '../order/entities/order.entity';
import { FileModule } from '../file/file.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Company, DeviceActivity, AuditLog, Order]),
    FileModule,
  ],
  controllers: [CompanyController],
  providers: [CompanyService],
  exports: [CompanyService],
})
export class CompanyModule {}
