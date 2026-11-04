// Subscription rules shared by the billing routes and the platform overview.

export const PLANS = ['TRIAL', 'STARTER', 'BUSINESS', 'ENTERPRISE'] as const;
export type Plan = (typeof PLANS)[number];

// Monthly price each plan starts at (RWF), as on the website's pricing section.
export const PLAN_PRICE: Record<Plan, number> = {
  TRIAL: 0,
  STARTER: 100_000,
  BUSINESS: 150_000,
  ENTERPRISE: 0,
};

export const PAY_METHODS = ['CASH', 'MOMO', 'BANK', 'CARD', 'OTHER'] as const;

export type BillingStatus = 'NOT_SET' | 'PAID' | 'DUE_SOON' | 'OVERDUE';

const DAY = 86_400_000;
export const DUE_SOON_DAYS = 7;

export const toDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parse = (day: string) => new Date(`${day}T12:00:00`);
export const addDays = (day: string, n: number) =>
  toDay(new Date(parse(day).getTime() + n * DAY));

// The same day `n` months later, kept inside short months (31 Jan + 1 = 28 Feb).
export function addMonths(day: string, n: number) {
  const d = parse(day);
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1, 12);
  const last = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0,
  ).getDate();
  target.setDate(Math.min(d.getDate(), last));
  return toDay(target);
}

export function billingStatus(
  plan: string | null,
  paidUntil: string | null,
  today = toDay(new Date()),
): BillingStatus {
  if (!plan) return 'NOT_SET';
  if (!paidUntil || paidUntil < today) return 'OVERDUE';
  return paidUntil < addDays(today, DUE_SOON_DAYS) ? 'DUE_SOON' : 'PAID';
}

// Lays payments end to end: each one starts the day after the one before ends,
// unless the company stopped for over a month, when it starts the day it was paid.
// A free trial's last day counts as already paid for.
export function lay<
  T extends { paidOn: string; months: number; createdAt?: Date },
>(payments: T[], trialEnds: string | null = null) {
  const ordered = [...payments].sort(
    (a, b) =>
      a.paidOn.localeCompare(b.paidOn) ||
      +(a.createdAt ?? 0) - +(b.createdAt ?? 0),
  );
  let until: string | null = trialEnds;
  const laid = ordered.map((p) => {
    const next: string | null = until ? addDays(until, 1) : null;
    const from: string =
      next && next >= addMonths(p.paidOn, -1) ? next : p.paidOn;
    const to = addDays(addMonths(from, p.months), -1);
    until = to;
    return { payment: p, coversFrom: from, coversTo: to };
  });
  return { laid, paidUntil: until };
}
