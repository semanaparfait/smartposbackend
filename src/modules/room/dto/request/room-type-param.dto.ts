import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class RoomTypeParams {
  @ApiProperty()
  @IsUUID()
  roomTypeId!: string;
}

export class RoomTypeIdParam extends PickType(RoomTypeParams, ['roomTypeId']) {}
