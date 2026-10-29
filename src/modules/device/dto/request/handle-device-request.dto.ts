import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { DeviceTypeEnum } from '../../entities/device.entity';

export enum DeviceRequestAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class HandleDeviceRequestDto {
  @ApiProperty({
    enum: DeviceRequestAction,
    example: DeviceRequestAction.APPROVE,
  })
  @IsEnum(DeviceRequestAction)
  action!: DeviceRequestAction;

  @ApiPropertyOptional({
    enum: DeviceTypeEnum,
    description:
      'When approving: what the device is used for (default POS_TERMINAL)',
  })
  @IsOptional()
  @IsEnum(DeviceTypeEnum)
  type?: DeviceTypeEnum;
}
