import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { TABLE_STATUSES, type TableStatus } from './venue.entity';

export class SaveLayoutDto {
  @ApiProperty({ description: 'The map as the app editor saves it' })
  @IsObject()
  layout!: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'The version you started from; refused if someone saved since',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  version?: number;
}

export class TableBookingDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiProperty()
  @IsDateString()
  at!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  guests?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

export class UpdateTableDto {
  @ApiPropertyOptional({ enum: TABLE_STATUSES })
  @IsOptional()
  @IsIn(TABLE_STATUSES)
  status?: TableStatus;

  @ApiPropertyOptional({ description: 'Order served here; null to unlink' })
  @IsOptional()
  @IsUUID()
  orderId?: string | null;

  @ApiPropertyOptional({ description: 'Booking; null to cancel it' })
  @IsOptional()
  @ValidateNested()
  @Type(() => TableBookingDto)
  booking?: TableBookingDto | null;
}
