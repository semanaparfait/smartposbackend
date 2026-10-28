import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RoomService } from './room.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard, RolesGuard } from 'src/common/guards';
import { Roles } from 'src/common/decorators/roles.decorator';
import { AnyEmployee } from 'src/common/decorators/any-employee.decorator';
import { UserRole } from '../user/entities/user.entity';
import { User } from 'src/common/decorators/user.decorator';
import { Payload } from 'src/util/token.service';
import { CreateRoomTypeDto } from './dto/request/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/request/update-room-type.dto';
import { UpdateRoomDto } from './dto/request/update-room.dto';
import { CreateRoomDto } from './dto/request/create-room.dto';
import { RoomIdParam, RoomStatusParam } from './dto/request/room-param.dto';
import { RoomTypeIdParam } from './dto/request/room-type-param.dto';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';

@ApiTags('Rooms & Room Types')
@Controller()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.OWNER)
@ApiBearerAuth()
export class RoomController {
  constructor(private readonly service: RoomService) {}

  @Post('room-types')
  @ApiOperation({ summary: 'Create room type' })
  createRoomType(@User() user: Payload, @Body() dto: CreateRoomTypeDto) {
    return this.service.createRoomType(user, dto);
  }

  @Get('room-types')
  @Roles(UserRole.OWNER, UserRole.EMPLOYEE)
  @AnyEmployee()
  @ApiOperation({ summary: 'Get all room types' })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'Super admin only',
  })
  getRoomTypes(@User() user: Payload, @Query('companyId') companyId?: string) {
    return this.service.getRoomTypes(user, companyId);
  }

  @Get('room-types/:roomTypeId')
  @Roles(UserRole.OWNER, UserRole.EMPLOYEE)
  @AnyEmployee()
  @ApiOperation({ summary: 'Get room type by id' })
  getRoomType(@User() user: Payload, @Param() { roomTypeId }: RoomTypeIdParam) {
    return this.service.getRoomType(user, roomTypeId);
  }

  @Patch('room-types/:roomTypeId')
  @ApiOperation({ summary: 'Update room type' })
  updateRoomType(
    @User() user: Payload,
    @Param() { roomTypeId }: RoomTypeIdParam,
    @Body() dto: UpdateRoomTypeDto,
  ) {
    return this.service.updateRoomType(user, roomTypeId, dto);
  }

  @Delete('room-types/:roomTypeId/delete')
  @ApiOperation({ summary: 'Delete room type' })
  deleteRoomType(
    @User() user: Payload,
    @Param() { roomTypeId }: RoomTypeIdParam,
  ) {
    return this.service.deleteRoomType(user, roomTypeId);
  }

  // ----------- Rooms ------------------

  @Post('rooms')
  @ApiOperation({ summary: 'Create room' })
  createRoom(@User() user: Payload, @Body() dto: CreateRoomDto) {
    return this.service.createRoom(user, dto);
  }

  @Get('rooms')
  @Roles(UserRole.OWNER, UserRole.EMPLOYEE)
  @AnyEmployee()
  @ApiOperation({ summary: 'Get all rooms' })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'Super admin only',
  })
  getRooms(@User() user: Payload, @Query('companyId') companyId?: string) {
    return this.service.getRooms(user, companyId);
  }

  @Get('rooms/:roomId')
  @Roles(UserRole.OWNER, UserRole.EMPLOYEE)
  @AnyEmployee()
  @ApiOperation({ summary: 'Get room by id' })
  getRoom(@User() user: Payload, @Param() { roomId }: RoomIdParam) {
    return this.service.getRoom(user, roomId);
  }

  @Patch('rooms/:roomId')
  @ApiOperation({ summary: 'Update room' })
  updateRoom(
    @User() user: Payload,
    @Param() { roomId }: RoomIdParam,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.service.updateRoom(user, roomId, dto);
  }

  @Patch('rooms/:roomId/status/:status')
  @RequirePermissions('tables.manage')
  @Roles(UserRole.OWNER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Change room status' })
  changeStatus(
    @User() user: Payload,
    @Param() { roomId, status }: RoomStatusParam,
  ) {
    return this.service.changeStatus(user, roomId, status);
  }

  @Delete('rooms/:roomId/delete')
  @ApiOperation({ summary: 'Delete room' })
  deleteRoom(@User() user: Payload, @Param() { roomId }: RoomIdParam) {
    return this.service.deleteRoom(user, roomId);
  }
}
