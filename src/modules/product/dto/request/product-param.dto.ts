import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ProductParams {
  @ApiProperty()
  @IsUUID()
  productId!: string;
}

export class ProductIdParam extends PickType(ProductParams, ['productId']) {}
