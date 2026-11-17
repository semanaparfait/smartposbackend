import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from './entities/device.entity';
import { RealtimeService } from '../realtime/realtime.service';

// Wrong tries in a row before the device locks.
export const MAX_SIGN_IN_TRIES = 5;
// Each lock since the last good sign-in lasts longer; the last one repeats.
const LOCK_MINUTES = [5, 15, 30, 60];

const minutesText = (minutes: number) =>
  minutes >= 60
    ? `${Math.round(minutes / 60)} hour${minutes >= 120 ? 's' : ''}`
    : `${minutes} minute${minutes === 1 ? '' : 's'}`;

// Wrong PINs and passwords are counted per device, in the database, so the lock
// holds across restarts and API instances. PIN sign-in, email sign-in and a
// cook's PIN on the kitchen screen all count together. While locked, attempts
// are refused without checking the PIN, so guessing can't go on meanwhile.
// The app shows a countdown (423 + retryAfter) and the owner can unlock early.
@Injectable()
export class SignInLockService {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepo: Repository<Device>,
    private readonly realtime: RealtimeService,
  ) {}

  private remainingMs(device: Pick<Device, 'lockedUntil'>) {
    return device.lockedUntil
      ? Math.max(0, new Date(device.lockedUntil).getTime() - Date.now())
      : 0;
  }

  private lockedError(ms: number) {
    const retryAfter = Math.ceil(ms / 1000);
    return new HttpException(
      {
        statusCode: HttpStatus.LOCKED,
        message: `Too many wrong tries. This device is locked for ${minutesText(Math.ceil(retryAfter / 60))}.`,
        lockedUntil: new Date(Date.now() + ms).toISOString(),
        retryAfter,
      },
      HttpStatus.LOCKED,
    );
  }

  // Throws 423 while the device is locked.
  assertOpen(device: Pick<Device, 'lockedUntil'>) {
    const ms = this.remainingMs(device);
    if (ms > 0) throw this.lockedError(ms);
  }

  // A wrong PIN or password on this device. Always throws: the wrong-try error
  // with `attemptsLeft`, or 423 when this try locks the device.
  // `status`: 401 on sign-in; the kitchen screen uses 400 (401 would sign it out).
  async failed(
    device: Device,
    message: string,
    status: HttpStatus = HttpStatus.UNAUTHORIZED,
  ): Promise<never> {
    // Counted in SQL so two wrong tries at once can't both slip through.
    const result = await this.deviceRepo
      .createQueryBuilder()
      .update(Device)
      .set({ failedSignIns: () => 'failed_sign_ins + 1' })
      .where('id = :id', { id: device.id })
      // Raw SQL on purpose: the array form takes property names and silently
      // drops anything else, which returned no row and locked on the first try.
      .returning('"failed_sign_ins", "lock_count"')
      .callListeners(false)
      .execute();
    let row = (
      result.raw as { failed_sign_ins: number; lock_count: number }[]
    )[0];
    // Never lock just because the count couldn't be read back: read it again.
    if (!row) {
      const fresh = await this.deviceRepo.findOne({
        where: { id: device.id },
        select: { id: true, failedSignIns: true, lockCount: true },
      });
      row = {
        failed_sign_ins: fresh?.failedSignIns ?? 1,
        lock_count: fresh?.lockCount ?? 0,
      };
    }
    const failures = Number(row.failed_sign_ins);
    const attemptsLeft = Math.max(0, MAX_SIGN_IN_TRIES - failures);

    if (attemptsLeft > 0) {
      const body = { statusCode: status, message, attemptsLeft };
      throw status === HttpStatus.UNAUTHORIZED
        ? new UnauthorizedException(body)
        : new HttpException(body, status);
    }

    const lockCount = Number(row.lock_count ?? 0) + 1;
    const minutes = LOCK_MINUTES[Math.min(lockCount, LOCK_MINUTES.length) - 1];
    const ms = minutes * 60_000;
    const lockedUntil = new Date(Date.now() + ms);
    await this.deviceRepo
      .createQueryBuilder()
      .update(Device)
      .set({ failedSignIns: 0, lockCount, lockedUntil })
      .where('id = :id', { id: device.id })
      .callListeners(false)
      .execute();

    const error = this.lockedError(ms);
    const lock = error.getResponse() as {
      message: string;
      retryAfter: number;
    };
    this.realtime.deviceLocked(
      {
        ...device,
        failedSignIns: MAX_SIGN_IN_TRIES,
        lockCount,
        lockedUntil,
      } as Device,
      { lockedUntil, retryAfter: lock.retryAfter, message: lock.message },
    );
    throw error;
  }

  // A good sign-in starts the count again (and the next lock is short again).
  async succeeded(device: Device) {
    if (!device.failedSignIns && !device.lockCount && !device.lockedUntil)
      return;
    await this.reset(device);
  }

  // Owner or super admin: lets staff try again now.
  async unlock(device: Device) {
    await this.reset(device);
    const unlocked = Object.assign(device, {
      failedSignIns: 0,
      lockCount: 0,
      lockedUntil: null,
    });
    this.realtime.signInUnlocked(unlocked);
    return unlocked;
  }

  // For the sign-in screen before anyone is signed in. Says nothing about
  // unknown devices beyond "not locked".
  async status(hardwareId: string) {
    const device = await this.deviceRepo.findOne({
      where: { deviceId: hardwareId },
      select: { id: true, failedSignIns: true, lockedUntil: true },
    });
    if (!device) return { locked: false };
    const ms = this.remainingMs(device);
    if (ms > 0) {
      const { lockedUntil, retryAfter } = this.lockedError(
        ms,
      ).getResponse() as {
        lockedUntil: string;
        retryAfter: number;
      };
      return { locked: true, lockedUntil, retryAfter, attemptsLeft: 0 };
    }
    return {
      locked: false,
      attemptsLeft: Math.max(
        0,
        MAX_SIGN_IN_TRIES - (device.failedSignIns ?? 0),
      ),
    };
  }

  private async reset(device: Device) {
    await this.deviceRepo
      .createQueryBuilder()
      .update(Device)
      .set({ failedSignIns: 0, lockCount: 0, lockedUntil: null })
      .where('id = :id', { id: device.id })
      .callListeners(false)
      .execute();
  }
}
