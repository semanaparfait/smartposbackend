import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductModule } from '../product/product.module';
import { DayClosing } from './day-closing.entity';
import { ClosingController } from './closing.controller';
import { ClosingService } from './closing.service';

@Module({
  imports: [TypeOrmModule.forFeature([DayClosing]), ProductModule],
  controllers: [ClosingController],
  providers: [ClosingService],
})
export class ClosingModule {}
