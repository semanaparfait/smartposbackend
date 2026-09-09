import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class CreateDeviceDto {
  @ApiProperty()
  @IsString()
  deviceId!: string;

  @ApiProperty()
  @IsString()
  deviceName!: string;

  @ApiProperty()
  @IsString()
  deviceOs!: string;

  @ApiProperty()
  @IsString()
  companyCode!: string;
}
