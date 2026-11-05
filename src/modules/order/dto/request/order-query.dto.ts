import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { OrderTypeEnum } from '../../entities/order.entity';

// Which orders to send. Without `from` every order comes back, as before; with
// it, the orders made or changed since then plus every order still open.
export class OrderQueryDto {
  @ApiProperty({ required: false, description: 'Super admin only' })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiProperty({
    required: false,
    description: 'ISO time: orders made or changed since then, plus open ones',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiProperty({ required: false, enum: OrderTypeEnum })
  @IsOptional()
  @IsEnum(OrderTypeEnum)
  type?: OrderTypeEnum;

  @ApiProperty({
    required: false,
    description: 'true: every paid order with a credit payment, whenever made',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  credit?: boolean;
}
