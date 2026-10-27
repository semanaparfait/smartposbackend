import { AsyncLocalStorage } from 'async_hooks';
import { UserRole } from 'src/modules/user/entities/user.entity';

// The authenticated user performing the current request, as recorded in audit columns.
export interface Actor {
  id: string;
  name?: string;
  email?: string;
  role: UserRole;
  companyId?: string;
}

interface Store {
  actor?: Actor;
}

const storage = new AsyncLocalStorage<Store>();

// Makes the current user available anywhere during a request (e.g. TypeORM subscribers)
// without passing it through every service call.
export const RequestContext = {
  run<T>(actor: Actor | undefined, fn: () => T): T {
    return storage.run({ actor }, fn);
  },

  actor(): Actor | undefined {
    return storage.getStore()?.actor;
  },
};
