import { Module } from '@nestjs/common';
import { FloorMapService } from './floor-map.service';
import { FloorMapController } from './floor-map.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FloorMap } from './entities/floor-map.entity';
import { Company } from '../company/entities/company.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FloorMap, Company])],
  controllers: [FloorMapController],
  providers: [FloorMapService],
})
export class FloorMapModule {}
