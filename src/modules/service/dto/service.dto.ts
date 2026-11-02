import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
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
import { ServiceUnitStatusEnum } from '../entities/service-unit.entity';
import { PriceUnitEnum, ServiceKindEnum } from '../entities/service.entity';

// Sent as a multipart form so a picture can come with it.
export class CreateServiceDto {
  @ApiProperty({
    required: false,
    description: 'Required for super admin; ignored for others',
  })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Please give the service a name' })
  @MaxLength(120)
  name!: string;

  @ApiProperty({ required: false })
  @Transform(blankToNull)
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ enum: ServiceKindEnum })
  @IsEnum(ServiceKindEnum)
  kind!: ServiceKindEnum;

  @ApiProperty({ enum: PriceUnitEnum })
  @IsEnum(PriceUnitEnum)
  priceUnit!: PriceUnitEnum;

  @ApiProperty()
  @Transform(toNumber)
  @IsNumber()
  @IsPositive({ message: 'The price must be above 0' })
  price!: number;

  @ApiProperty({ required: false, description: 'Blank = no limit' })
  @Transform(toNumberOrNull)
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number | null;

  @ApiProperty({ required: false, default: 0 })
  @Transform(toNumber)
  @IsOptional()
  @IsNumber()
  @Min(0)
  deposit?: number;

  @ApiProperty({ required: false, default: true })
  @Transform(toBoolean)
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({
    required: false,
    description:
      'Names of the bookable units, as JSON text (["Room 101","Room 102"]). Only used when creating.',
  })
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  units?: string[];

  @ApiProperty({ type: 'string', format: 'binary', required: false })
  @IsOptional()
  picture?: any;

  @ApiProperty({
    required: false,
    description:
      'A picture from image search or a pasted link, instead of an upload',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  pictureUrl?: string;
}

export class UpdateServiceDto extends PartialType(CreateServiceDto) {}

export class ServiceIdParam {
  @IsUUID()
  serviceId!: string;
}

export class UnitIdParam {
  @IsUUID()
  unitId!: string;
}

export class CreateUnitDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Please give it a name' })
  @MaxLength(60)
  name!: string;
}

export class UpdateUnitDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Please give it a name' })
  @MaxLength(60)
  name?: string;

  @ApiProperty({
    required: false,
    enum: ServiceUnitStatusEnum,
    description: 'OCCUPIED is set by check-in only',
  })
  @IsOptional()
  @IsEnum(ServiceUnitStatusEnum)
  status?: ServiceUnitStatusEnum;
}
