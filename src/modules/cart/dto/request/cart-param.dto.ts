import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CartParams {
  @ApiProperty()
  @IsUUID()
  cartId!: string;
}

export class CartIdParam extends PickType(CartParams, ['cartId']) {}
