import { randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { GeoPosition } from './entities/order.entity';

// Wrong codes allowed before the code stops working for that delivery.
export const MAX_CODE_TRIES = 5;

// A delivery confirmed further than this (plus the phone's own accuracy) from
// the customer's place is flagged. City GPS is often off by 50–300 m.
export const AWAY_METRES = 300;

// The customer's page stays open this long after the delivery is finished.
export const PAGE_DAYS_AFTER = 2;

// 4 digits, from a secure random source. Leading zeros are kept ("0427").
export const newDeliveryCode = () =>
  String(randomInt(0, 10_000)).padStart(4, '0');

// Unguessable link for the customer's page.
export const newTrackToken = () => randomBytes(18).toString('base64url');

// Same length and constant time, so timing reveals nothing about the code.
export function codesMatch(given: string, expected: string) {
  const a = Buffer.from(given.trim());
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// "0788 123 456", "+250788123456" and "788123456" all become "250788123456".
export function intlPhone(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('250')) return digits;
  if (digits.length === 10 && digits.startsWith('0'))
    return `250${digits.slice(1)}`;
  if (digits.length === 9 && digits.startsWith('7')) return `250${digits}`;
  return digits;
}

// Straight-line distance in metres (haversine).
export function metresBetween(
  a: Pick<GeoPosition, 'lat' | 'lng'>,
  b: Pick<GeoPosition, 'lat' | 'lng'>,
) {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// The public link to a customer's page, or null when the server doesn't know
// its own public address (the message then goes without a link).
export function trackUrl(token: string | null | undefined) {
  const base = (process.env.PUBLIC_API_URL ?? process.env.BACKEND_SOURCE ?? '')
    .trim()
    .replace(/\/+$/, '');
  if (!token || !/^https?:\/\//.test(base)) return null;
  const prefix = (process.env.PREFIX ?? '').replace(/^\/+|\/+$/g, '');
  return `${base}${prefix ? `/${prefix}` : ''}/d/${token}`;
}
