import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PaymentMethodEnum } from '../../entities/payment.entity';

const isCredit = (p: PaymentDto) => p.method === PaymentMethodEnum.CREDIT;

export class PaymentDto {
  @ApiProperty({ enum: PaymentMethodEnum, example: PaymentMethodEnum.CASH })
  @IsEnum(PaymentMethodEnum)
  method!: PaymentMethodEnum;

  @ApiProperty({ example: 5000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @ApiProperty({ required: false, description: 'Required for CREDIT' })
  @ValidateIf(isCredit)
  @IsString()
  @IsNotEmpty()
  creditOwnerName?: string;

  @ApiProperty({ required: false, description: 'Required for CREDIT' })
  @ValidateIf(isCredit)
  @IsString()
  @IsNotEmpty()
  creditOwnerPhone?: string;

  @ApiProperty({
    required: false,
    description: 'Required for CREDIT: who took the goods',
  })
  @ValidateIf(isCredit)
  @IsString()
  @IsNotEmpty()
  takenBy?: string;
}

export class CompleteOrderDto {
  @ApiProperty({
    type: [PaymentDto],
    description:
      'How the order was paid; split across methods if needed. Amounts must add up to the order total.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PaymentDto)
  payments!: PaymentDto[];
}
