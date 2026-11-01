import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class RestockProductDto {
  @ApiProperty({ example: 24, description: 'How much arrived' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  quantity!: number;

  @ApiProperty({ required: false, example: 'Delivery from the supplier' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}
