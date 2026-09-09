import 'tsconfig-paths/register';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
config();

import { envDetermine } from './config/database.config';

const envi: string = envDetermine() || 'DEV';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env[`${envi}_DATABASE_URL`],
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: true,
});
