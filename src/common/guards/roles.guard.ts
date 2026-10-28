import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { UserRole } from 'src/modules/user/entities/user.entity';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { hasPermission } from '../permissions/permissions';
import { loadAccount, permissionsVersion } from '../permissions/account';
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

    // Read live on every request, so deactivating a worker or changing their role
    // takes effect immediately instead of when the token expires.
    const account = await loadAccount(this.dataSource, user.sub);

    if (!account?.active)
      throw new UnauthorizedException('Your account has been deactivated');

    user.permissions = account.permissions;

    // Changes whenever the role's permissions change; the app refetches /auth/me
    // when it sees a different value, so new access shows up without a re-login.
    context
      .switchToHttp()
      .getResponse<Response>()
      .setHeader('X-Permissions-Version', permissionsVersion(user.permissions));

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
}
