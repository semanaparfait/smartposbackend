import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateMultipleDevicesDto {
  @ApiProperty({
    description:
      'true: may be signed in on several devices at once. false (default): signing in on a device signs them out of the others.',
  })
  @IsBoolean()
  allow!: boolean;
}
