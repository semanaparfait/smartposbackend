import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../order/entities/order.entity';
import { VenueLayout, VenueTable } from './venue.entity';
import { VenueController } from './venue.controller';
import { VenueService } from './venue.service';

@Module({
  imports: [TypeOrmModule.forFeature([VenueLayout, VenueTable, Order])],
  controllers: [VenueController],
  providers: [VenueService],
})
export class VenueModule {}
