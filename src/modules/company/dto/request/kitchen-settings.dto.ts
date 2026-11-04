import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class KitchenSettingsDto {
  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;
}
