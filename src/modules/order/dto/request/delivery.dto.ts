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
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethodEnum } from '../../entities/payment.entity';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

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
}

export class CheckoutDto {
  @ApiProperty({ required: false, type: DeliveryDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryDetailsDto)
  delivery?: DeliveryDetailsDto;
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
}
