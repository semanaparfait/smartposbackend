import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ProductCategoryParams {
  @ApiProperty()
  @IsUUID()
  categoryId!: string;
}

export class ProductCategoryIdParam extends PickType(ProductCategoryParams, [
  'categoryId',
]) {}
