import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { OrderStatusEnum } from '../../entities/order.entity';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatusEnum })
  @IsEnum(OrderStatusEnum)
  status!: OrderStatusEnum;

  @ApiProperty({
    required: false,
    description:
      "With kitchen stations: move only this station's part of the order",
  })
  @IsOptional()
  @IsUUID()
  stationId?: string;
}

export class MarkServedDto {
  @ApiProperty({
    required: false,
    description:
      "With kitchen stations: only this station's part was taken out",
  })
  @IsOptional()
  @IsUUID()
  stationId?: string;
}
