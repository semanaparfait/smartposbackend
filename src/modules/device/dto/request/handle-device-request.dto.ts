import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

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
}
