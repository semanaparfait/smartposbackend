import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

export const isProduction = () => process.env.NODE_ENV === 'production';

// Websites allowed to call the API from a browser, from CORS_ORIGINS
// (comma separated, e.g. "https://smartpos.rw,https://www.smartpos.rw").
// The mobile app sends no Origin, so it is never blocked by this.
const allowList = () =>
  (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);

// The SmartPOS desktop app (Electron) loads itself from this address.
const DESKTOP_APP = 'app://smartpos';

// While developing: the website, the app's web version (Expo, port 8081) and
// phones on the same Wi-Fi, on any port.
const LOCAL =
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;

// The phone app sends no Origin and the desktop app is always allowed.
// Without CORS_ORIGINS every website may call the API during development;
// in production only the listed ones can.
export function originAllowed(origin: string | undefined) {
  if (!origin) return true;
  const clean = origin.replace(/\/$/, '');
  if (clean === DESKTOP_APP) return true;
  if (!isProduction() && LOCAL.test(clean)) return true;
  const list = allowList();
  if (!list.length) return !isProduction();
  return list.includes(clean);
}

// For Express' cors and socket.io: (origin, callback) => allowed or not.
export const corsOrigin = (
  origin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void,
) => callback(null, originAllowed(origin));

export const missingOriginsWarning = () =>
  isProduction() && !allowList().length
    ? 'CORS_ORIGINS is not set: browsers (the website) cannot call the API. Set it to your website address.'
    : null;

// Request limits per address (see app.module.ts). Tills in one shop often share
// one internet address, so the general limit is generous; signing in and the
// public forms have their own, much smaller limits (@Throttle on those routes).
export const LIMITS = [{ name: 'default', ttl: 60_000, limit: 1200 }];

export const SIGN_IN_LIMIT = { default: { ttl: 60_000, limit: 10 } };
export const PUBLIC_FORM_LIMIT = { default: { ttl: 60_000, limit: 5 } };

// Counts HTTP requests only; the realtime socket has its own sign-in checks.
@Injectable()
export class HttpThrottlerGuard extends ThrottlerGuard {
  override canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return Promise.resolve(true);
    return super.canActivate(context);
  }
}
