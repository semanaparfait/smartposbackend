import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ItemParams {
  @ApiProperty()
  @IsUUID()
  itemId!: string;
}

export class ItemIdParam extends PickType(ItemParams, ['itemId']) {}
