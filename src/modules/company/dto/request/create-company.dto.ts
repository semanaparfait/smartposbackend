import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CompanyType } from '../../entities/company.entity';

export class CreateCompanyDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  email!: string;

  @ApiProperty()
  @IsString()
  phone_number!: string;

  @ApiProperty()
  @IsString()
  location!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  tin?: string;

  @ApiProperty({ enum: CompanyType })
  @IsEnum(CompanyType)
  type!: CompanyType;

  @ApiProperty({
    required: false,
    minimum: 1,
    maximum: 240,
    description: 'Longest a sale may stay on hold, in minutes',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(240)
  maxHoldMinutes?: number;
}
