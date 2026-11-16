import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethodEnum } from '../../entities/payment.entity';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export const NOTIFY_BY = ['WHATSAPP', 'SMS'] as const;
export const LANGUAGES = ['en', 'rw', 'fr', 'sw'] as const;

// A phone's position, as expo-location gives it.
export class PositionDto {
  @ApiProperty({ example: -1.9441 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({ example: 30.0619 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @ApiProperty({ required: false, example: 15, description: 'Metres' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracy?: number | null;
}

// How the person marking it delivered proves the customer got it: the
// customer's code (typed or from their QR), or why there was none.
export class DeliveryProofDto {
  @ApiProperty({ required: false, example: '4827' })
  @IsOptional()
  @Matches(/^\d{4,8}$/, { message: 'The code is 4 digits' })
  code?: string;

  @ApiProperty({ required: false, enum: ['CODE', 'QR'] })
  @IsOptional()
  @IsIn(['CODE', 'QR'])
  via?: 'CODE' | 'QR';

  @ApiProperty({
    required: false,
    example: 'Customer lost the message',
    description: 'Given instead of the code; the delivery is flagged',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  noCodeReason?: string;

  @ApiProperty({ required: false, type: PositionDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => PositionDto)
  position?: PositionDto | null;
}

export class ArrivedDto {
  @ApiProperty({ required: false, type: PositionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PositionDto)
  position?: PositionDto;
}

export class CodeSentDto {
  @ApiProperty({ enum: NOTIFY_BY })
  @IsIn(NOTIFY_BY)
  via!: (typeof NOTIFY_BY)[number];
}

// Sent with checkout to make the order a delivery.
export class DeliveryDetailsDto {
  @ApiProperty({ example: 'Aline' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  customerName!: string;

  @ApiProperty({ required: false, example: '0788123456' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(30)
  customerPhone?: string;

  @ApiProperty({ required: false, example: 'KG 11 Ave, near the market' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  address?: string;

  @ApiProperty({
    required: false,
    description:
      "One of the owner's delivery areas (required when areas are set)",
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  area?: string;

  @ApiProperty({ description: 'The customer pays when it arrives' })
  @IsBoolean()
  payOnDelivery!: boolean;

  @ApiProperty({ required: false, description: 'One of the shop riders' })
  @IsOptional()
  @IsUUID()
  riderId?: string;

  @ApiProperty({
    required: false,
    description: 'An outside service, e.g. "Moto - Eric 0788..."',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  outsideRider?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  note?: string;

  // With delivery codes on: how the till will send the customer their code,
  // and in which language.
  @ApiProperty({ required: false, enum: NOTIFY_BY })
  @IsOptional()
  @IsIn(NOTIFY_BY)
  notifyBy?: (typeof NOTIFY_BY)[number];

  @ApiProperty({ required: false, enum: LANGUAGES })
  @IsOptional()
  @IsIn(LANGUAGES)
  customerLanguage?: (typeof LANGUAGES)[number];
}

export class CheckoutDto {
  @ApiProperty({ required: false, type: DeliveryDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryDetailsDto)
  delivery?: DeliveryDetailsDto;

  // Adds the cart to this open order instead of making a new one (more food
  // for a table that is still being served).
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  orderId?: string;
}

export class SendDeliveryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  riderId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  outsideRider?: string;
}

// Money taken at the door: cash, MoMo or card (no credit).
export class DoorPaymentDto {
  @ApiProperty({ enum: ['CASH', 'MOMO', 'CARD'] })
  @IsIn([
    PaymentMethodEnum.CASH,
    PaymentMethodEnum.MOMO,
    PaymentMethodEnum.CARD,
  ])
  method!: PaymentMethodEnum;

  @ApiProperty({ example: 5000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;
}

export class DeliveredDto {
  @ApiProperty({
    required: false,
    type: [DoorPaymentDto],
    description: 'Required when the customer pays at the door',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => DoorPaymentDto)
  payments?: DoorPaymentDto[];

  // Who took it, when that's only known afterwards (or wasn't set).
  @ApiProperty({ required: false, description: 'One of the shop riders' })
  @IsOptional()
  @IsUUID()
  riderId?: string;

  @ApiProperty({ required: false, example: 'Moto - Eric 0788...' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  outsideRider?: string;

  @ApiProperty({
    required: false,
    type: DeliveryProofDto,
    description: 'Required when the order needs a delivery code',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryProofDto)
  proof?: DeliveryProofDto;
}

export class NotDeliveredDto {
  @ApiProperty({ example: 'Customer did not answer' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  reason!: string;
}

export class DeliveryAreaDto {
  @ApiProperty({ example: 'Remera' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name!: string;

  @ApiProperty({ example: 1500 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  fee!: number;
}

export class DeliverySettingsDto {
  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;

  @ApiProperty({ description: 'The shop has its own riders' })
  @IsBoolean()
  riders!: boolean;

  @ApiProperty({ description: 'Fee for every delivery when no areas are set' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  fee!: number;

  @ApiProperty({ type: [DeliveryAreaDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => DeliveryAreaDto)
  areas!: DeliveryAreaDto[];

  @ApiProperty({
    required: false,
    description: 'Customers get a code the rider needs to finish a delivery',
  })
  @IsOptional()
  @IsBoolean()
  codes?: boolean;
}
