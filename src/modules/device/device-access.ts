import { featuresOf } from '../company/features';
import { Device } from './entities/device.entity';

// Shown to staff the owner hasn't chosen for a device.
export const DEVICE_NOT_YOURS =
  "You can't use this device. Ask the owner to add you to it.";

// Whether this staff member is kept off the device: only while the company has
// the "Choose who uses each device" extra on and the owner chose someone.
export const keepsOut = (
  device: Pick<Device, 'allowedUserIds' | 'company'>,
  userId: string,
) => {
  const chosen = device.allowedUserIds ?? [];
  return (
    featuresOf(device.company?.features).deviceAccess &&
    chosen.length > 0 &&
    !chosen.includes(userId)
  );
};
