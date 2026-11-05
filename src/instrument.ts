// Error tracking (Sentry). Loaded before anything else in main.ts. Without
// SENTRY_DSN nothing is sent, so development and tests are unaffected.
import * as Sentry from '@sentry/nestjs';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    // A tenth of requests are timed, to spot slow routes.
    tracesSampleRate: Number(process.env.SENTRY_TRACES_RATE ?? 0.1),
    // Personal details (names, emails, IP addresses) are not sent: Sentry's default.
  });
}
