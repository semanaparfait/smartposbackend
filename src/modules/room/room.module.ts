import { Module } from '@nestjs/common';
import { RoomService } from './room.service';
import { RoomController } from './room.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomType } from './entities/room-type.entity';
import { Room } from './entities/room.entity';
import { FloorMap } from '../floor-map/entities/floor-map.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RoomType, Room, FloorMap])],
  controllers: [RoomController],
  providers: [RoomService],
})
export class RoomModule {}
