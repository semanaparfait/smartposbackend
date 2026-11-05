import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CountedMoneyDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  CASH!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  MOMO!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  CARD!: number;
}

export class CountedStockDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  counted!: number;
}

export class CloseDayDto {
  @ApiProperty({ type: CountedMoneyDto })
  @ValidateNested()
  @Type(() => CountedMoneyDto)
  counted!: CountedMoneyDto;

  @ApiProperty({
    type: [CountedStockDto],
    description: 'Products counted; the rest keep the system number',
  })
  @IsArray()
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => CountedStockDto)
  stock!: CountedStockDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
