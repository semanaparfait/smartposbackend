import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { RoomService } from './room.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateRoomTypeDto } from './dto/request/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/request/update-room-type.dto';
import { RoomStatusEnum } from './entities/room.entity';
import { UpdateRoomDto } from './dto/request/update-room.dto';
import { CreateRoomDto } from './dto/request/create-room.dto';
import { RoomIdParam } from './dto/request/room-param.dto';
import { RoomTypeIdParam } from './dto/request/room-type-param.dto';

@ApiTags('Rooms & Room Types')
@Controller()
export class RoomController {
  constructor(private readonly service: RoomService) {}

  @Post('room-types')
  @ApiOperation({ summary: 'Create room type' })
  createRoomType(@Body() dto: CreateRoomTypeDto) {
    return this.service.createRoomType(dto);
  }

  @Get('room-types')
  @ApiOperation({ summary: 'Get all room types' })
  getRoomTypes() {
    return this.service.getRoomTypes();
  }

  @Get('room-types/:roomTypeId')
  @ApiOperation({ summary: 'Get room type by id' })
  getRoomType(@Param() { roomTypeId }: RoomTypeIdParam) {
    return this.service.getRoomType(roomTypeId);
  }

  @Patch('room-types/:roomTypeId')
  @ApiOperation({ summary: 'Update room type' })
  updateRoomType(
    @Param() { roomTypeId }: RoomTypeIdParam,
    @Body() dto: UpdateRoomTypeDto,
  ) {
    return this.service.updateRoomType(roomTypeId, dto);
  }

  @Delete('room-types/:roomTypeId/delete')
  @ApiOperation({ summary: 'Delete room type' })
  deleteRoomType(@Param() { roomTypeId }: RoomTypeIdParam) {
    return this.service.deleteRoomType(roomTypeId);
  }

  // ----------- Rooms ------------------

  @Post('rooms')
  @ApiOperation({ summary: 'Create room' })
  createRoom(@Body() dto: CreateRoomDto) {
    return this.service.createRoom(dto);
  }

  @Get('rooms')
  @ApiOperation({ summary: 'Get all rooms' })
  getRooms() {
    return this.service.getRooms();
  }

  @Get('rooms/:roomId')
  @ApiOperation({ summary: 'Get room by id' })
  getRoom(@Param() { roomId }: RoomIdParam) {
    return this.service.getRoom(roomId);
  }

  @Patch('rooms/:roomId')
  @ApiOperation({ summary: 'Update room' })
  updateRoom(@Param() { roomId }: RoomIdParam, @Body() dto: UpdateRoomDto) {
    return this.service.updateRoom(roomId, dto);
  }

  @Patch('rooms/:roomId/status/:status')
  @ApiOperation({ summary: 'Change room status' })
  changeStatus(
    @Param() { roomId }: RoomIdParam,
    @Param('status') status: RoomStatusEnum,
  ) {
    return this.service.changeStatus(roomId, status);
  }

  @Delete('rooms/:roomId/delete')
  @ApiOperation({ summary: 'Delete room' })
  deleteRoom(@Param() { roomId }: RoomIdParam) {
    return this.service.deleteRoom(roomId);
  }
}
