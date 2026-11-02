import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { blankToNull } from 'src/common/utils/form-values';
import { StaffDebtKindEnum } from '../entities/staff-debt.entity';
import { DebtPaymentMethodEnum } from '../entities/staff-debt-payment.entity';
import { SalaryMethodEnum } from '../entities/salary-payment.entity';

// Charged to a worker: by employee, or by their login when it comes from a
// count, a payment or an expense.
export class CreateStaffDebtDto {
  @ApiProperty({ required: false })
  @ValidateIf((dto: CreateStaffDebtDto) => !dto.userId)
  @IsUUID('all', { message: 'Choose the worker' })
  employeeId?: string;

  @ApiProperty({ required: false, description: 'The worker’s login instead' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ enum: StaffDebtKindEnum })
  @IsEnum(StaffDebtKindEnum)
  kind!: StaffDebtKindEnum;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @IsPositive({ message: 'The amount must be above 0' })
  amount!: number;

  @ApiProperty({ example: '2026-11-02' })
  @IsDateString()
  date!: string;

  @ApiProperty({ required: false })
  @Transform(blankToNull)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string | null;

  @ApiProperty({
    required: false,
    description: 'What it came from, charged once',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  source?: string;
}

// A manager records money the worker gave back, or takes it from the salary.
export class RecordDebtPaymentDto {
  @ApiProperty()
  @IsUUID('all', { message: 'Choose the worker' })
  employeeId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @IsPositive({ message: 'The amount must be above 0' })
  amount!: number;

  @ApiProperty({ enum: DebtPaymentMethodEnum })
  @IsEnum(DebtPaymentMethodEnum)
  method!: DebtPaymentMethodEnum;

  @ApiProperty({ required: false })
  @Transform(blankToNull)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string | null;
}

const WORKER_METHODS = [DebtPaymentMethodEnum.CASH, DebtPaymentMethodEnum.MOMO];

// A worker pays back what they owe. Multipart, with an optional proof photo.
export class SubmitDebtPaymentDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @IsPositive({ message: 'The amount must be above 0' })
  amount!: number;

  @ApiProperty({ enum: WORKER_METHODS })
  @IsIn(WORKER_METHODS, { message: 'Pay by cash or MoMo' })
  method!: DebtPaymentMethodEnum;

  @ApiProperty({ required: false })
  @Transform(blankToNull)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string | null;

  @ApiProperty({ type: 'string', format: 'binary', required: false })
  @IsOptional()
  picture?: any;
}

// A month's salary handed to a worker. What they owe can be taken off it.
export class PaySalaryDto {
  @ApiProperty()
  @IsUUID('all', { message: 'Choose the worker' })
  employeeId!: string;

  @ApiProperty({ example: '2026-11' })
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Choose the month' })
  month!: string;

  @ApiProperty({
    description: 'Taken off for what the worker owes',
    default: 0,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  deducted!: number;

  @ApiProperty({ description: 'Handed to the worker' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiProperty({ enum: SalaryMethodEnum })
  @IsEnum(SalaryMethodEnum, { message: 'Say how the salary was paid' })
  method!: SalaryMethodEnum;

  @ApiProperty({ example: '2026-11-30' })
  @IsDateString()
  paidOn!: string;

  @ApiProperty({ required: false })
  @Transform(blankToNull)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string | null;
}

export class SalaryPaymentIdParam {
  @IsUUID()
  salaryPaymentId!: string;
}

export class RejectDebtPaymentDto {
  @ApiProperty()
  @Transform(blankToNull)
  @IsString({ message: 'Say why it is rejected' })
  @MinLength(3, { message: 'Say why it is rejected' })
  @MaxLength(255)
  note!: string;
}

export class DebtIdParam {
  @IsUUID()
  debtId!: string;
}

export class DebtPaymentIdParam {
  @IsUUID()
  paymentId!: string;
}
