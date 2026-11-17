import { HttpException, HttpStatus } from '@nestjs/common';

// Device log wording. Owners see plain words; only the super admin sees the
// endpoint (method and path) behind each entry.

// "Update company profile (owners: their own company only)" -> "Update company profile"
export const plainAction = (action: string) => {
  // Old entries saved the endpoint when an action had no summary.
  if (/^(GET|POST|PUT|PATCH|DELETE) \//.test(action)) return 'Other change';
  return action.replace(/\s*\([^)]*\)\s*$/, '').trim() || 'Other change';
};

// What to show for a request that failed: the server's own message, except for
// server errors, whose details are not for staff.
export const errorText = (error: unknown) => {
  if (!(error instanceof HttpException))
    return 'Something went wrong on the server';
  const status = error.getStatus();
  if (status >= 500) return 'Something went wrong on the server';
  if (status === Number(HttpStatus.TOO_MANY_REQUESTS))
    return 'Too many tries at once. Wait a moment and try again.';
  const body = error.getResponse();
  const message =
    typeof body === 'string' ? body : (body as { message?: unknown }).message;
  if (Array.isArray(message)) return message.join(', ');
  return typeof message === 'string' ? message : error.message;
};
