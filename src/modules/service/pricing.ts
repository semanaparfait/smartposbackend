import { PriceUnitEnum } from './entities/service.entity';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

// Same rules as the app's config/services.ts, so the price shown while booking is
// the price charged.
//  - Hours are charged by the started quarter hour (1 h 10 min = 1.25 h).
//  - Nights count from check-in to check-out, rounded to the nearest night, so
//    arriving at 14:00 and leaving at 11:00 the next day is one night.
//  - Days are charged by the started 24 hours, with one hour of grace.
//  - Sessions are as many as asked for; per person is by people.
export function measuredQuantity(
  unit: PriceUnitEnum,
  from: Date,
  to: Date,
): number {
  const span = Math.max(0, to.getTime() - from.getTime());

  switch (unit) {
    case PriceUnitEnum.HOUR:
      return Math.max(1, Math.ceil(span / (HOUR_MS / 4))) / 4;
    case PriceUnitEnum.NIGHT:
      return Math.max(1, Math.round(span / DAY_MS));
    case PriceUnitEnum.DAY:
      return Math.max(1, Math.ceil((span - HOUR_MS) / DAY_MS));
    default:
      return 1;
  }
}

export const isTimed = (unit: PriceUnitEnum) =>
  unit === PriceUnitEnum.HOUR ||
  unit === PriceUnitEnum.NIGHT ||
  unit === PriceUnitEnum.DAY;

// How many price units a booking is charged before anyone has checked out:
// measured from the planned times, or 0 when open-ended (charged by time used).
export function bookedQuantity(
  unit: PriceUnitEnum,
  startAt: Date,
  endAt: Date | null,
  people: number,
  sessions = 1,
): number {
  if (isTimed(unit)) return endAt ? measuredQuantity(unit, startAt, endAt) : 0;
  if (unit === PriceUnitEnum.PERSON) return people;
  if (unit === PriceUnitEnum.SESSION) return sessions;
  return 1;
}

export const money = (value: number) => Math.round(value * 100) / 100;
