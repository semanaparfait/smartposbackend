import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from 'src/modules/user/entities/user.entity';
import { Payload } from 'src/util/token.service';

// Company-scoping rules shared by every module:
//  - SUPERADMIN can see and change every company's data.
//  - Everyone else is limited to the company in their token.

export const isSuperAdmin = (user: Payload) =>
  user.role === UserRole.SUPERADMIN;

// Company the user is limited to, or undefined when they may see every company.
// A SUPERADMIN may narrow results to one company with `filterCompanyId`.
export function scopeCompanyId(
  user: Payload,
  filterCompanyId?: string,
): string | undefined {
  if (isSuperAdmin(user)) return filterCompanyId || undefined;

  if (!user.companyId)
    throw new ForbiddenException('User is not assigned to a company');

  return user.companyId;
}

// `where` fragment limiting a query on an entity with a `company` relation.
export function companyWhere(user: Payload, filterCompanyId?: string) {
  const companyId = scopeCompanyId(user, filterCompanyId);
  return companyId ? { company: { id: companyId } } : {};
}

// Company new data is created for: a SUPERADMIN must say which company, everyone
// else always creates data for their own company.
export function targetCompanyId(user: Payload, requested?: string): string {
  if (isSuperAdmin(user)) {
    if (!requested)
      throw new BadRequestException('companyId is required for super admin');
    return requested;
  }

  const own = scopeCompanyId(user) as string;

  if (requested && requested !== own)
    throw new ForbiddenException('You can only manage your own company');

  return own;
}
