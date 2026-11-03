import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { MoneyCheck } from './entities/money-check.entity';
import { MoneyCheckController } from './money-check.controller';
import { MoneyCheckService } from './money-check.service';

@Module({
  imports: [TypeOrmModule.forFeature([MoneyCheck, User])],
  controllers: [MoneyCheckController],
  providers: [MoneyCheckService],
})
export class MoneyCheckModule {}
