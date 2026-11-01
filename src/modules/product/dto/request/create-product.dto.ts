import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import {
  blankToNull,
  toBoolean,
  toNumber,
  toNumberOrNull,
} from 'src/common/utils/form-values';

export class CreateProductDto {
  @ApiProperty({
    required: false,
    description: 'Required for super admin; ignored for others',
  })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  picture?: any;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  buyingPrice!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @IsPositive({ message: 'Selling price must be above 0' })
  sellingPrice!: number;

  @ApiProperty({ required: false })
  @Transform(blankToNull)
  @IsOptional()
  @IsString()
  barCode?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ingredients?: string;

  @ApiProperty({ required: false, nullable: true })
  @Transform(blankToNull)
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Transform(blankToNull)
  @IsOptional()
  @IsString()
  sku?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Transform(blankToNull)
  @IsOptional()
  @IsString()
  supplier?: string | null;

  @ApiProperty({ required: false, example: 'Piece', default: 'Piece' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  unit?: string;

  @ApiProperty({ required: false, default: false })
  @Transform(toBoolean)
  @IsOptional()
  @IsBoolean()
  trackStock?: boolean;

  @ApiProperty({
    required: false,
    default: 0,
    description:
      'Counted stock. Send it on update only when it was really changed: it replaces the current number (needs inventory.adjust).',
  })
  @Transform(toNumber)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  stockQuantity?: number;

  @ApiProperty({ required: false, nullable: true })
  @Transform(toNumberOrNull)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  lowStockLevel?: number | null;

  @ApiProperty({ required: false, nullable: true, example: '2027-03-31' })
  @Transform(blankToNull)
  @IsOptional()
  @IsDateString(
    { strict: true },
    { message: 'Expiry date must be a real date (YYYY-MM-DD)' },
  )
  expiryDate?: string | null;

  @ApiProperty({ required: false, default: false })
  @Transform(toBoolean)
  @IsOptional()
  @IsBoolean()
  sendToKitchen?: boolean;
}
