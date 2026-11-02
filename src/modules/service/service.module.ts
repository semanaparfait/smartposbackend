import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileModule } from '../file/file.module';
import { ServiceOffering } from './entities/service.entity';
import { ServiceUnit } from './entities/service-unit.entity';
import { Booking } from './entities/booking.entity';
import { BookingPayment } from './entities/booking-payment.entity';
import { StaffDebt } from '../payroll/entities/staff-debt.entity';
import { ServiceService } from './service.service';
import { BookingService } from './booking.service';
import { ReceiptService } from './receipt.service';
import { ServiceController } from './service.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServiceOffering,
      ServiceUnit,
      Booking,
      BookingPayment,
      StaffDebt,
    ]),
    FileModule,
  ],
  controllers: [ServiceController],
  providers: [ServiceService, BookingService, ReceiptService],
})
export class ServiceModule {}
