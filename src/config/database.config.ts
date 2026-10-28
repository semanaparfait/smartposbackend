import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AuditSubscriber } from 'src/modules/audit/audit.subscriber';

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
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: false,
    subscribers: [AuditSubscriber],
    // Connections shared by all requests. With many tills at once, raise
    // DB_POOL_MAX (within your database plan's connection limit).
    extra: { max: Number(process.env.DB_POOL_MAX) || 10 },
    // logging: envi === 'DEV',
    migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
    migrationsRun: envi === 'PROD',
  };
}

export default registerAs('database', connectDb);
