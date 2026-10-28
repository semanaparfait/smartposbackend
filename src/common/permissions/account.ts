import { createHash } from 'crypto';
import { DataSource } from 'typeorm';
import { UserRole } from 'src/modules/user/entities/user.entity';
import { effectivePermissions } from './permissions';

export interface Account {
  active: boolean;
  role: UserRole;
  companyId: string | null;
  // null = everything allowed (non-employees, or a role without a list); an
  // employee without a role gets only their extras. Includes the employee's own
  // extra / removed permissions.
  permissions: string[] | null;
  // Employees signed in on one device at a time: the session currently allowed
  // (null = any, e.g. before their next login or when multiple are allowed).
  sessionId: string | null;
}

// Read live (not from the token), so deactivating a user or changing their role
// takes effect at once, both for HTTP requests and open sockets.
export async function loadAccount(
  dataSource: DataSource,
  userId: string,
): Promise<Account | null> {
  const rows: {
    active: boolean;
    role: UserRole;
    company_id: string | null;
    role_id: string | null;
    permissions: string[] | null;
    extra: string[] | null;
    removed: string[] | null;
    session_id: string | null;
    allow_multiple_devices: boolean;
  }[] = await dataSource.query(
    `SELECT u.active, u.role, u.company_id, u.session_id, u.allow_multiple_devices,
            r.id AS role_id, r.permissions,
            e.extra_permissions AS extra, e.removed_permissions AS removed
       FROM users u
       LEFT JOIN employees e ON e.id = u.employee_id
       LEFT JOIN employee_roles r ON r.id = e.role_id
      WHERE u.id = $1`,
    [userId],
  );

  const row = rows[0];
  if (!row) return null;

  return {
    active: row.active,
    role: row.role,
    companyId: row.company_id,
    sessionId:
      row.role === UserRole.EMPLOYEE && !row.allow_multiple_devices
        ? row.session_id
        : null,
    permissions:
      row.role !== UserRole.EMPLOYEE
        ? null
        : effectivePermissions(
            row.role_id ? row.permissions : undefined,
            row.extra ?? [],
            row.removed ?? [],
          ),
  };
}

// False when the employee has since signed in on another device.
export function isCurrentSession(account: Account, sid?: string) {
  return !account.sessionId || account.sessionId === sid;
}

export const SIGNED_IN_ELSEWHERE = 'You signed in on another device';

// Changes whenever the effective permissions change; clients compare it to know
// when to refetch /auth/me.
export function permissionsVersion(permissions: string[] | null) {
  const value = JSON.stringify(permissions ? [...permissions].sort() : null);
  return createHash('sha1').update(value).digest('hex').slice(0, 12);
}
