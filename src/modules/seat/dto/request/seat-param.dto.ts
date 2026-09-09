import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SeatParams {
  @ApiProperty()
  @IsUUID()
  seatId!: string;
}

export class SeatIdParam extends PickType(SeatParams, ['seatId']) {}
