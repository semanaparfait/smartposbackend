import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateStationDto {
  @ApiProperty({
    required: false,
    description: 'Required for super admin; ignored for others',
  })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiProperty({ example: 'Bar' })
  @Transform(trim)
  @IsString()
  @Length(1, 40, { message: 'Station name must be 1 to 40 characters' })
  name!: string;

  @ApiProperty({ required: false, example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateStationDto extends PartialType(CreateStationDto) {}

export class StationIdParam {
  @ApiProperty()
  @IsUUID()
  stationId!: string;
}
