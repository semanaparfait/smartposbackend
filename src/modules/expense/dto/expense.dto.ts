import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { blankToNull } from 'src/common/utils/form-values';
import {
  ExpenseCategoryEnum,
  ExpensePaidFromEnum,
  ExpenseRepeatEnum,
} from '../entities/expense.entity';

export class CreateExpenseDto {
  @ApiProperty({
    required: false,
    description: 'Required for super admin; ignored for others',
  })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiProperty({ example: 'Electricity bill' })
  @IsString()
  @IsNotEmpty({ message: 'Say what it was for' })
  @MaxLength(120)
  title!: string;

  @ApiProperty({ enum: ExpenseCategoryEnum })
  @IsEnum(ExpenseCategoryEnum)
  category!: ExpenseCategoryEnum;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @IsPositive({ message: 'The amount must be above 0' })
  amount!: number;

  @ApiProperty({ enum: ExpenseRepeatEnum, default: ExpenseRepeatEnum.ONCE })
  @IsOptional()
  @IsEnum(ExpenseRepeatEnum)
  repeat?: ExpenseRepeatEnum;

  @ApiProperty({
    example: '2026-11-01',
    description: 'Paid on, or first day covered',
  })
  @IsDateString()
  startDate!: string;

  @ApiProperty({
    required: false,
    description: 'Last day a repeating cost applies',
  })
  @Transform(blankToNull)
  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @ApiProperty({ required: false })
  @Transform(blankToNull)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string | null;

  @ApiProperty({ required: false, enum: ExpensePaidFromEnum })
  @IsOptional()
  @IsEnum(ExpensePaidFromEnum)
  paidFrom?: ExpensePaidFromEnum | null;
}

export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}

// A worker's expense, paid while the owner was away. Sent as a multipart form
// with the photo of the receipt.
export class SubmitExpenseDto {
  @ApiProperty({ example: 'Electricity token' })
  @IsString()
  @IsNotEmpty({ message: 'Say what it was for' })
  @MaxLength(120)
  title!: string;

  @ApiProperty({ enum: ExpenseCategoryEnum })
  @IsEnum(ExpenseCategoryEnum)
  category!: ExpenseCategoryEnum;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @IsPositive({ message: 'The amount must be above 0' })
  amount!: number;

  @ApiProperty({ example: '2026-11-02', description: 'The day it was paid' })
  @IsDateString()
  paidOn!: string;

  @ApiProperty({ enum: ExpensePaidFromEnum })
  @IsEnum(ExpensePaidFromEnum, { message: 'Say where the money came from' })
  paidFrom!: ExpensePaidFromEnum;

  @ApiProperty({ required: false })
  @Transform(blankToNull)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string | null;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Receipt photo',
  })
  @IsOptional()
  picture?: any;
}

export class RejectExpenseDto {
  @ApiProperty({ description: 'Why it is rejected' })
  @Transform(blankToNull)
  @IsString({ message: 'Say why it is rejected' })
  @MinLength(3, { message: 'Say why it is rejected' })
  @MaxLength(255)
  note!: string;
}

export class ExpenseIdParam {
  @IsUUID()
  expenseId!: string;
}
