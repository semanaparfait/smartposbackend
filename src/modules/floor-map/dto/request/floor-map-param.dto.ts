import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class FloorMapParams {
  @ApiProperty()
  @IsUUID()
  floorMapId!: string;
}

export class FloorMapIdParam extends PickType(FloorMapParams, ['floorMapId']) {}
