import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class DeviceParams {
  @ApiProperty()
  @IsUUID()
  deviceId!: string;
}

export class DeviceIdParam extends PickType(DeviceParams, ['deviceId']) {}
