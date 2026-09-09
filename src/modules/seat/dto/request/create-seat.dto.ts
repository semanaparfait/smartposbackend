import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsString, IsUUID } from 'class-validator';
import { SeatStatusEnum } from '../../entities/seat.entity';

export class CreateSeatDto {
  @ApiProperty()
  @IsUUID()
  roomId!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  img!: string;

  @ApiProperty()
  @IsNumber()
  xCoordinate!: number;

  @ApiProperty()
  @IsNumber()
  yCoordinate!: number;

  @ApiProperty({
    enum: SeatStatusEnum,
    default: SeatStatusEnum.AVAILABLE,
  })
  @IsEnum(SeatStatusEnum)
  status!: SeatStatusEnum;
}
