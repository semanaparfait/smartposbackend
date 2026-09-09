import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class OrderParams {
  @ApiProperty()
  @IsUUID()
  orderId!: string;
}

export class OrderIdParam extends PickType(OrderParams, ['orderId']) {}
