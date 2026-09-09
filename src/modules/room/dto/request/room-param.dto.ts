import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class RoomParams {
  @ApiProperty()
  @IsUUID()
  roomId!: string;
}

export class RoomIdParam extends PickType(RoomParams, ['roomId']) {}
