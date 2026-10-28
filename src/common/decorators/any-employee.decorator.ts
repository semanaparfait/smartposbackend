import { SetMetadata } from '@nestjs/common';

export const ANY_EMPLOYEE_KEY = 'anyEmployee';

// Marks an endpoint that also allows owners as open to every employee (e.g. the
// product list the till sells from). Without it, such an endpoint must name the
// permission an employee needs (see RolesGuard).
export const AnyEmployee = () => SetMetadata(ANY_EMPLOYEE_KEY, true);
