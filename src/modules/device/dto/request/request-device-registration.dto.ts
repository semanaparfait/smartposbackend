import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RequestDeviceRegistrationDto {
  @ApiProperty()
  @IsString()
  companyCode!: string;
}
