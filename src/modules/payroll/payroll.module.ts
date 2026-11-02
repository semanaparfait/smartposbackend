import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../employee/entities/employee.entity';
import { FileModule } from '../file/file.module';
import { StaffDebt } from './entities/staff-debt.entity';
import { StaffDebtPayment } from './entities/staff-debt-payment.entity';
import { SalaryPayment } from './entities/salary-payment.entity';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StaffDebt,
      StaffDebtPayment,
      SalaryPayment,
      Employee,
    ]),
    FileModule,
  ],
  controllers: [PayrollController],
  providers: [PayrollService],
})
export class PayrollModule {}
