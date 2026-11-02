import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
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

  @ApiProperty({
    required: false,
    example: 1200,
    description: 'What one unit cost in this delivery; replaces the buying price',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCost?: number;

  @ApiProperty({ required: false, example: '2027-03-31' })
  @IsOptional()
  @IsDateString(
    { strict: true },
    { message: 'Expiry date must be a real date (YYYY-MM-DD)' },
  )
  expiryDate?: string;
}
