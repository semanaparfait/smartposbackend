import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { SeatStatusEnum } from '../../entities/seat.entity';

export class SeatParams {
  @ApiProperty()
  @IsUUID()
  seatId!: string;

  @ApiProperty({ enum: SeatStatusEnum })
  @IsEnum(SeatStatusEnum)
  status!: SeatStatusEnum;
}

export class SeatIdParam extends PickType(SeatParams, ['seatId']) {}

export class SeatStatusParam extends PickType(SeatParams, [
  'seatId',
  'status',
]) {}
