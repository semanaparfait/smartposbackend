import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { blankToNull } from 'src/common/utils/form-values';
import { ReceiptStatusEnum } from '../entities/booking-payment.entity';

export class ReceiptQueryDto {
  @ApiProperty({
    required: false,
    description: 'Payments from (ISO date-time)',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiProperty({
    required: false,
    description: 'Payments before (ISO date-time)',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiProperty({ required: false, enum: ReceiptStatusEnum })
  @IsOptional()
  @IsEnum(ReceiptStatusEnum)
  receipt?: ReceiptStatusEnum;

  @ApiProperty({ required: false, description: 'Super admin only' })
  @IsOptional()
  @IsUUID()
  companyId?: string;
}

export class ConfirmReceiptsDto {
  @ApiProperty({ type: [String], description: 'Booking payment ids' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  ids!: string[];
}

export class MissingReceiptDto {
  @ApiProperty({ description: 'What happened to the money' })
  @Transform(blankToNull)
  @IsString({ message: 'Say what happened to the money' })
  @MinLength(3, { message: 'Say what happened to the money' })
  @MaxLength(255)
  note!: string;
}

export class PaymentIdParam {
  @IsUUID()
  paymentId!: string;
}
