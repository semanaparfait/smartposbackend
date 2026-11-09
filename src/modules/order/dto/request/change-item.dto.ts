import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class ChangeItemQuantityDto {
  @ApiProperty({ description: 'New quantity, lower than now; 0 removes it' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity!: number;
}
