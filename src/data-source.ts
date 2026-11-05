import 'tsconfig-paths/register';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
config();

import { envDetermine, sslOptions } from './config/database.config';
import { AuditSubscriber } from './modules/audit/audit.subscriber';

const envi: string = envDetermine() || 'DEV';

export const AppDataSource = new DataSource({
  type: 'postgres',
  // Migrations change tables, so they may use a stronger database user
  // (<ENV>_MIGRATION_DATABASE_URL) than the running server.
  url:
    process.env[`${envi}_MIGRATION_DATABASE_URL`] ??
    process.env[`${envi}_DATABASE_URL`],
  ...sslOptions(),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  subscribers: [AuditSubscriber],
  logging: true,
});
