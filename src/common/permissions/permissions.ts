import { ForbiddenException } from '@nestjs/common';
import { UserRole } from 'src/modules/user/entities/user.entity';
import { Payload } from 'src/util/token.service';

// Every permission a role can grant, mirrored from the app's config/permissions.ts
// (key -> keys it requires). The keys are a contract with the app and with saved
// roles: add new ones, never rename or remove an existing one.
export const PERMISSIONS: Record<string, string[]> = {
  // Selling
  'sales.create': [],
  'sales.checkout': ['sales.create'],
  'sales.split_payment': ['sales.checkout'],
  'sales.credit': ['sales.checkout'],
  'sales.cancel': ['sales.create'],
  // Orders
  'orders.view_own': [],
  'orders.view_all': ['orders.view_own'],
  // Tables & services
  'tables.manage': [],
  'services.manage': [],
  // Products & stock
  'inventory.view': [],
  'inventory.adjust': ['inventory.view'],
  'products.manage': [],
  // Money & reports (reports.view: staff performance and change history)
  'reports.view': [],
  'finance.verify': ['reports.view'],
  'credits.view': [],
  // Team & settings
  'employees.manage': [],
  'roles.manage': [],
  'devices.manage': [],
  'settings.manage': [],
};

export const PERMISSION_KEYS = Object.keys(PERMISSIONS);

// Turning a permission on also turns on what it requires (same rule as the app).
export function withRequirements(keys: Iterable<string>): string[] {
  const out = new Set<string>();
  const add = (key: string) => {
    if (out.has(key) || !(key in PERMISSIONS)) return;
    out.add(key);
    PERMISSIONS[key].forEach(add);
  };
  for (const key of keys) add(key);
  return PERMISSION_KEYS.filter((key) => out.has(key));
}

// Turning a permission off also turns off everything that requires it.
export function withoutDependents(
  keys: Iterable<string>,
  removed: Iterable<string>,
): string[] {
  const dropped = new Set(removed);
  const isDropped = (key: string): boolean =>
    dropped.has(key) || PERMISSIONS[key]?.some(isDropped);
  return [...keys].filter((key) => !isDropped(key));
}

// What an employee may do: their role's permissions plus the extras the owner
// gave them, minus the ones taken away. `role` undefined = no role (nothing);
// a role with `null` permissions allows everything, and stays `null` while no
// permission is taken away.
export function effectivePermissions(
  role: string[] | null | undefined,
  extra: string[] = [],
  removed: string[] = [],
): string[] | null {
  if (role === null && !removed.length) return null;

  const base = role === null ? PERMISSION_KEYS : (role ?? []);
  return withoutDependents(withRequirements([...base, ...extra]), removed);
}

// Permissions only limit employees: owners and super admins are governed by their
// role alone. For employees, `null` means their role predates permissions (or was
// saved without a list) and allows everything, matching the app.
export function hasPermission(user: Payload, key: string): boolean {
  if (user.role !== UserRole.EMPLOYEE) return true;

  if (user.permissions === undefined)
    throw new Error('Permissions were not loaded for this request');

  return user.permissions === null || user.permissions.includes(key);
}

// Keys an employee lacks out of `keys` (null = everything). Owners and super
// admins lack nothing, nor does an employee whose permissions allow everything.
export function missingPermissions(
  user: Payload,
  keys: string[] | null,
): string[] {
  if (user.role !== UserRole.EMPLOYEE) return [];

  if (user.permissions === undefined)
    throw new Error('Permissions were not loaded for this request');

  const own = user.permissions;
  if (own === null) return [];

  return (keys ?? PERMISSION_KEYS).filter((key) => !own.includes(key));
}

// An employee who manages roles or staff can only hand out access they have.
export function assertCanGrant(user: Payload, keys: string[] | null) {
  const missing = missingPermissions(user, keys);
  if (missing.length)
    throw new ForbiddenException(
      `You cannot give access you don't have (${missing.join(', ')})`,
    );
}

// For checks that depend on the request body (e.g. paying on credit).
export function requirePermission(user: Payload, key: string) {
  if (!hasPermission(user, key))
    throw new ForbiddenException(`Your role does not allow this (${key})`);
}
