import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { DeviceTypeEnum } from '../../entities/device.entity';

export class UpdateDeviceTypeDto {
  @ApiProperty({ enum: DeviceTypeEnum, example: DeviceTypeEnum.POS_TERMINAL })
  @IsEnum(DeviceTypeEnum)
  type!: DeviceTypeEnum;

  @ApiPropertyOptional({
    description:
      'Customer displays only: id of the POS terminal whose cart it shows',
  })
  @IsOptional()
  @IsUUID()
  displayForId?: string | null;
}
