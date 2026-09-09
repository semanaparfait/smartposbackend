import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class CreateCartDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  seatId?: string;
}
