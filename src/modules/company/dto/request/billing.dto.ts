import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PAY_METHODS, PLANS } from '../../billing';

export class SetPlanDto {
  @ApiProperty({ enum: PLANS })
  @IsIn(PLANS)
  plan!: (typeof PLANS)[number];

  @ApiProperty({ description: 'RWF a month' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyPrice!: number;

  @ApiProperty({
    required: false,
    description: 'TRIAL only: the last free day',
  })
  @IsOptional()
  @IsDateString()
  trialEnds?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class RecordPaymentDto {
  @ApiProperty({ description: 'RWF' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount!: number;

  @ApiProperty({ minimum: 1, maximum: 36 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(36)
  months!: number;

  @ApiProperty({ enum: PAY_METHODS })
  @IsIn(PAY_METHODS)
  method!: (typeof PAY_METHODS)[number];

  @ApiProperty({ example: '2026-11-04' })
  @IsDateString()
  paidOn!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
