import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { readFileSync } from 'fs';
import { AuditSubscriber } from 'src/modules/audit/audit.subscriber';

// DB_SSL_CA: path to the database provider's CA certificate. With it, the
// server checks it really talks to your database (like sslmode=verify-full).
export function sslOptions() {
  const ca = process.env.DB_SSL_CA;
  return ca
    ? { ssl: { ca: readFileSync(ca, 'utf8'), rejectUnauthorized: true } }
    : {};
}

export function envDetermine(): string {
  const envi: string = String(process.env.NODE_ENV);

  switch (envi) {
    case 'development':
      return 'DEV';
    case 'test':
      return 'TEST';
    case 'production':
      return 'PROD';
    default:
      return 'DEV';
  }
}

function connectDb(): TypeOrmModuleOptions {
  const envi: string = envDetermine();

  return {
    type: 'postgres',
    url: process.env[`${envi}_DATABASE_URL`],
    ...sslOptions(),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: false,
    subscribers: [AuditSubscriber],
    // Connections shared by all requests. With many tills at once, raise
    // DB_POOL_MAX (within your database plan's connection limit).
    extra: { max: Number(process.env.DB_POOL_MAX) || 10 },
    // logging: envi === 'DEV',
    migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
    // Off (MIGRATIONS_RUN=off) when the server's database user may only read
    // and write rows; then run `npm run migration:run` with the owner's URL.
    migrationsRun: envi === 'PROD' && process.env.MIGRATIONS_RUN !== 'off',
  };
}

export default registerAs('database', connectDb);
