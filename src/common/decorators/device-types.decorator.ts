import { SetMetadata } from '@nestjs/common';
import { DeviceTypeEnum } from 'src/modules/device/entities/device.entity';

export const DEVICE_TYPES_KEY = 'deviceTypes';

// Employees signed in on a device may only call the endpoint from a device of
// one of these types (e.g. no selling from a kitchen display). Checked by
// RolesGuard; sessions not opened on a device are not limited.
export const DeviceTypes = (...types: DeviceTypeEnum[]) =>
  SetMetadata(DEVICE_TYPES_KEY, types);
