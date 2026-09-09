import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

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
    // logging: envi === 'DEV',
    migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
    migrationsRun: envi === 'PROD',
  };
}

export default registerAs('database', connectDb);
