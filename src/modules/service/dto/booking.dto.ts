import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { blankToNull } from 'src/common/utils/form-values';
import { PaymentMethodEnum } from 'src/modules/order/entities/payment.entity';
import { BookingStatusEnum } from '../entities/booking.entity';

// Money is taken straight away; what is not paid stays as the booking's balance.
const BOOKING_METHODS = [
  PaymentMethodEnum.CASH,
  PaymentMethodEnum.MOMO,
  PaymentMethodEnum.CARD,
];

export class BookingPaymentDto {
  @ApiProperty({ enum: BOOKING_METHODS })
  @IsIn(BOOKING_METHODS, { message: 'Pay by cash, mobile money or card' })
  method!: PaymentMethodEnum;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @IsPositive({ message: 'The amount must be above 0' })
  amount!: number;
}

export enum BookingModeEnum {
  BOOK = 'BOOK', // Reserve ahead; check in when they arrive
  START = 'START', // They are here now: check in straight away
  SELL = 'SELL', // A ticket or one-off: paid and done at once
}

export class CreateBookingDto {
  @ApiProperty()
  @IsUUID()
  serviceId!: string;

  @ApiProperty({
    required: false,
    description: 'Needed when the service has units',
  })
  @IsOptional()
  @IsUUID()
  unitId?: string;

  @ApiProperty({ enum: BookingModeEnum })
  @IsEnum(BookingModeEnum)
  mode!: BookingModeEnum;

  @ApiProperty({ required: false, description: 'Blank = walk-in customer' })
  @Transform(blankToNull)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  customerName?: string | null;

  @ApiProperty({ required: false })
  @Transform(blankToNull)
  @IsOptional()
  @IsString()
  @MaxLength(30)
  customerPhone?: string | null;

  @ApiProperty({ required: false, default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  people?: number;

  @ApiProperty({
    required: false,
    default: 1,
    description: 'Per-session services',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  sessions?: number;

  @ApiProperty({ required: false, description: 'Defaults to now' })
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiProperty({
    required: false,
    description: 'Blank = open-ended, charged by time used',
  })
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiProperty({ required: false })
  @Transform(blankToNull)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string | null;

  @ApiProperty({ required: false, type: BookingPaymentDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BookingPaymentDto)
  payment?: BookingPaymentDto;
}

export class CheckOutDto {
  @ApiProperty({ required: false, default: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiProperty({ required: false, type: BookingPaymentDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BookingPaymentDto)
  payment?: BookingPaymentDto;
}

// Cancelling and refunding always say why, for whoever checks the money later.
export class CancelBookingDto {
  @ApiProperty()
  @Transform(blankToNull)
  @IsString({ message: 'Say why it is cancelled' })
  @MinLength(3, { message: 'Say why it is cancelled' })
  @MaxLength(255)
  reason!: string;
}

export class RefundBookingDto extends BookingPaymentDto {
  @ApiProperty()
  @Transform(blankToNull)
  @IsString({ message: 'Say why the money is given back' })
  @MinLength(3, { message: 'Say why the money is given back' })
  @MaxLength(255)
  reason!: string;
}

export class BookingIdParam {
  @IsUUID()
  bookingId!: string;
}

export class BookingQueryDto {
  @ApiProperty({
    required: false,
    description: 'Bookings starting from (ISO date-time)',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiProperty({
    required: false,
    description: 'Bookings starting before (ISO date-time)',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiProperty({ required: false, enum: BookingStatusEnum })
  @IsOptional()
  @IsEnum(BookingStatusEnum)
  status?: BookingStatusEnum;

  @ApiProperty({ required: false, description: 'Super admin only' })
  @IsOptional()
  @IsUUID()
  companyId?: string;
}

export class TakingsQueryDto {
  @ApiProperty({ description: 'From (ISO date-time)' })
  @IsDateString()
  from!: string;

  @ApiProperty({ description: 'Before (ISO date-time)' })
  @IsDateString()
  to!: string;

  @ApiProperty({ required: false, description: 'Super admin only' })
  @IsOptional()
  @IsUUID()
  companyId?: string;
}
