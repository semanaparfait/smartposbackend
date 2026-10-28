import { createHash } from 'crypto';
import { DataSource } from 'typeorm';
import { UserRole } from 'src/modules/user/entities/user.entity';

export interface Account {
  active: boolean;
  role: UserRole;
  companyId: string | null;
  // null = everything allowed (non-employees, or a role without a list); an
  // employee without a role gets nothing.
  permissions: string[] | null;
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
  }[] = await dataSource.query(
    `SELECT u.active, u.role, u.company_id, r.id AS role_id, r.permissions
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
    permissions:
      row.role !== UserRole.EMPLOYEE
        ? null
        : row.role_id
          ? row.permissions
          : [],
  };
}

// Changes whenever the effective permissions change; clients compare it to know
// when to refetch /auth/me.
export function permissionsVersion(permissions: string[] | null) {
  const value = JSON.stringify(permissions ? [...permissions].sort() : null);
  return createHash('sha1').update(value).digest('hex').slice(0, 12);
}
