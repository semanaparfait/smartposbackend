import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsUUID } from 'class-validator';
import { RoomStatusEnum } from '../../entities/room.entity';

export class CreateRoomDto {
  @ApiProperty()
  @IsUUID()
  floorMapId!: string;

  @ApiProperty()
  @IsUUID()
  roomTypeId!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({
    enum: RoomStatusEnum,
    default: RoomStatusEnum.AVAILABLE,
  })
  @IsEnum(RoomStatusEnum)
  status!: RoomStatusEnum;
}
