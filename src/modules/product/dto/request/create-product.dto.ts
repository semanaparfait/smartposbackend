import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsNumber, IsUUID } from 'class-validator';

export class CreateProductDto {
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
  buyingPrice!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  sellingPrice!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  barCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ingredients?: string;
}
