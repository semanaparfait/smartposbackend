import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { UserRole } from 'src/modules/user/entities/user.entity';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { hasPermission } from '../permissions/permissions';
import { Payload } from 'src/util/token.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const user = context.switchToHttp().getRequest().user as
      | Payload
      | undefined;

    // SUPERADMIN has access to every endpoint.
    if (user?.role === UserRole.SUPERADMIN) return true;

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredRoles && !requiredRoles.includes(user?.role as UserRole))
      return false;

    if (user?.role !== UserRole.EMPLOYEE) return true;

    // Read live from the role, so a removed permission is refused immediately (the
    // app itself picks role changes up at the next sign-in).
    user.permissions = await this.loadPermissions(user.sub);

    const required =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    const missing = required.filter((key) => !hasPermission(user, key));

    if (missing.length)
      throw new ForbiddenException(
        `Your role does not allow this (${missing.join(', ')})`,
      );

    return true;
  }

  // null = the role allows everything; an employee without a role gets nothing.
  private async loadPermissions(userId: string): Promise<string[] | null> {
    const rows: { role_id: string | null; permissions: string[] | null }[] =
      await this.dataSource.query(
        `SELECT r.id AS role_id, r.permissions
           FROM users u
           LEFT JOIN employees e ON e.id = u.employee_id
           LEFT JOIN employee_roles r ON r.id = e.role_id
          WHERE u.id = $1`,
        [userId],
      );

    if (!rows[0]?.role_id) return [];

    return rows[0].permissions;
  }
}
