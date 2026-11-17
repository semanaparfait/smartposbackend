import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;

// Simple in-memory brute-force protection for login attempts. Each key (an email or a
// device) is locked for WINDOW_MS after MAX_FAILURES failed attempts. Per process only,
// so with several API instances behind a load balancer move this to Redis.
@Injectable()
export class LoginThrottleService {
  private readonly failures = new Map<
    string,
    { count: number; resetAt: number }
  >();

  // `max`: failures allowed in the window (default MAX_FAILURES).
  assertAllowed(key: string, max = MAX_FAILURES) {
    const entry = this.failures.get(key);
    if (!entry) return;

    if (entry.resetAt <= Date.now()) {
      this.failures.delete(key);
      return;
    }

    if (entry.count >= max) {
      const minutes = Math.ceil((entry.resetAt - Date.now()) / 60000);
      throw new HttpException(
        `Too many failed attempts, try again in ${minutes} minute(s)`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  recordFailure(key: string) {
    const now = Date.now();
    const entry = this.failures.get(key);

    if (!entry || entry.resetAt <= now) {
      this.failures.set(key, { count: 1, resetAt: now + WINDOW_MS });
    } else {
      entry.count++;
    }
  }

  reset(key: string) {
    this.failures.delete(key);
  }
}
