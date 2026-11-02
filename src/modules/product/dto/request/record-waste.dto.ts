import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class RecordWasteDto {
  @ApiProperty({ example: 1.5, description: 'How much was lost' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  quantity!: number;

  @ApiProperty({ example: 'Spoiled in the fridge' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason!: string;
}
