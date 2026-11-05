import type { Request, Response } from 'express';
import { isProduction } from 'src/common/security/security';
import { refreshDays } from './refresh-token.service';

// The website's renewal token. httpOnly: page scripts can never read it.
export const REFRESH_COOKIE = 'sp_refresh';

// Sent only to the sign-in routes.
const path = () =>
  `/${process.env.PREFIX ?? 'api/v1'}/auth`.replace(/\/+/g, '/');

// COOKIE_SAMESITE: "none" when the website and the API are on different sites
// (needs HTTPS); "lax" when the API is on the website's own domain, e.g.
// api.smartpos.rw for smartpos.rw (safest, and works in every browser).
const sameSite = (): 'lax' | 'none' | 'strict' => {
  const v = (
    process.env.COOKIE_SAMESITE ?? (isProduction() ? 'none' : 'lax')
  ).toLowerCase();
  return v === 'none' || v === 'strict' ? v : 'lax';
};

const options = () => {
  const site = sameSite();
  return {
    httpOnly: true,
    // SameSite=None is only accepted over HTTPS.
    secure: isProduction() || site === 'none',
    sameSite: site,
    path: path(),
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  };
};

export function readCookie(req: Request, name: string) {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

// Puts the renewal token in the cookie and leaves it out of the reply body.
export function keepRefreshInCookie<T extends { refreshToken?: string }>(
  res: Response,
  session: T,
): Omit<T, 'refreshToken'> {
  const { refreshToken, ...rest } = session;
  if (refreshToken)
    res.cookie(REFRESH_COOKIE, refreshToken, {
      ...options(),
      maxAge: refreshDays() * 86_400_000,
    });
  return rest;
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, options());
}
