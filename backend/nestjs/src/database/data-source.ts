import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// โหลด environment variables
config({ path: `.env.${process.env.NODE_ENV || 'dev'}` });

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '123456',
  database: process.env.DB_NAME || 'kornpassorn_db',
  entities: ['src/database/entities/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false, // ใช้ migration แทน
  logging: process.env.NODE_ENV === 'dev',
});