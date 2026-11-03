import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { MoneyCheckStatusEnum } from '../entities/money-check.entity';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export class SaveMoneyCheckDto {
  @ApiProperty({ example: '2026-11-03' })
  @Matches(DAY, { message: 'date must be YYYY-MM-DD' })
  date!: string;

  @ApiProperty({ description: 'The worker whose money was counted' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ enum: MoneyCheckStatusEnum })
  @IsEnum(MoneyCheckStatusEnum)
  status!: MoneyCheckStatusEnum;

  @ApiProperty({ example: { CASH: 12000, MOMO: 5000 } })
  @IsObject()
  counted!: Record<string, number>;

  @ApiProperty({ example: { CASH: 12000, MOMO: 5000 } })
  @IsObject()
  expected!: Record<string, number>;

  @ApiProperty()
  @IsNumber()
  difference!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @ApiProperty({
    required: false,
    description:
      'When it was decided (for checks saved offline); now if left out',
  })
  @IsOptional()
  @IsDateString()
  decidedAt?: string;

  @ApiProperty({
    required: false,
    description: 'Name of who decided (for checks saved offline)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  decidedBy?: string;
}

export class MoneyCheckParams {
  @ApiProperty({ example: '2026-11-03' })
  @Matches(DAY, { message: 'date must be YYYY-MM-DD' })
  date!: string;

  @ApiProperty()
  @IsUUID()
  userId!: string;
}
