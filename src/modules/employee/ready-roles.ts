import { EntityManager } from 'typeorm';
import { withRequirements } from 'src/common/permissions/permissions';
import { EmployeeRole } from './entities/employee-role.entity';

// Roles made for the owner when they turn a feature on, so they only have to
// add the worker. Found by the permission that defines them.
export const READY_ROLES = {
  rider: {
    key: 'deliveries.ride',
    name: 'Delivery rider',
    description:
      'Takes delivery orders to customers, marks them delivered and collects money at the door.',
  },
  kitchen: {
    key: 'kitchen.prepare',
    name: 'Kitchen staff',
    description: 'Prepares orders on the kitchen screen and marks them ready.',
  },
} as const;

// The shop's role for this job, made if it has none. Kept if one exists already.
export async function ensureReadyRole(
  manager: EntityManager,
  companyId: string,
  ready: (typeof READY_ROLES)[keyof typeof READY_ROLES],
) {
  const roles = manager.getRepository(EmployeeRole);
  const existing = await roles
    .createQueryBuilder('r')
    .where('r.company_id = :companyId', { companyId })
    .andWhere(':key = ANY(r.permissions)', { key: ready.key })
    .getOne();
  if (existing) return { id: existing.id, name: existing.name, created: false };

  const role = await roles.save(
    roles.create({
      name: ready.name,
      description: ready.description,
      permissions: withRequirements([ready.key]),
      company: { id: companyId },
    }),
  );
  return { id: role.id, name: role.name, created: true };
}
