import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../employee/entities/employee.entity';
import { Expense } from './entities/expense.entity';
import { ExpenseService } from './expense.service';
import { ExpenseController } from './expense.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Expense, Employee])],
  controllers: [ExpenseController],
  providers: [ExpenseService],
})
export class ExpenseModule {}
