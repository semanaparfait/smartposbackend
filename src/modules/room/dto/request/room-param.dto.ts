import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { RoomStatusEnum } from '../../entities/room.entity';

export class RoomParams {
  @ApiProperty()
  @IsUUID()
  roomId!: string;

  @ApiProperty({ enum: RoomStatusEnum })
  @IsEnum(RoomStatusEnum)
  status!: RoomStatusEnum;
}

export class RoomIdParam extends PickType(RoomParams, ['roomId']) {}

export class RoomStatusParam extends PickType(RoomParams, [
  'roomId',
  'status',
]) {}
