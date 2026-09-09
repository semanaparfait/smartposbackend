import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class PinLoginDto {
  @ApiProperty()
  @IsString()
  deviceId!: string;

  @ApiProperty()
  @IsString()
  pin!: string;
}
