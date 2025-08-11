import { DataSource } from 'typeorm';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { config } from 'dotenv';
import { getEntitiesForDatabase, getEntityPathsForDatabase, DEFAULT_ENTITIES } from './entity-registry';

// โหลด environment variables
config({ path: `.env.${process.env.NODE_ENV || 'dev'}` });

// Database configuration function สำหรับ NestJS TypeORM
export const databaseConfig = (dbName?: string): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '123456',
  database: dbName || process.env.DB_NAME || 'postgres', // ใช้ postgres เป็น default ตาม .env.dev
  entities: getEntitiesForDatabase(dbName), // ใช้ entities จาก registry
  autoLoadEntities: true,
  synchronize: true,
});

// Helper function สำหรับสร้าง DataSource configuration
const createDataSourceConfig = (dbName?: string) => ({
  type: 'postgres' as const,
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '123456',
  database: dbName || process.env.DB_NAME || 'kornpassorn_db',
  entities: getEntityPathsForDatabase(dbName), // ใช้ entity paths จาก registry
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false, // ใช้ migration แทน
  logging: process.env.NODE_ENV === 'dev',
});

// DataSource instances cache
const dataSourceCache = new Map<string, DataSource>();

// Default DataSource (postgres) - ใช้ databaseConfig setting
const defaultDataSource = new DataSource({
  type: 'postgres' as const,
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '123456',
  database: process.env.DB_NAME || 'postgres', // ใช้ postgres เป็น default ตาม .env.dev
  entities: getEntityPathsForDatabase('default'), // ใช้ default entities
  migrations: ['src/database/migrations/*.ts'],
  synchronize: true, // databaseConfig style
  logging: process.env.NODE_ENV === 'dev',
});

// AppDataSource function - รองรับทั้ง default และ specific database
export const AppDataSource = (dbName?: string) => {
  if (!dbName) {
    // ไม่ระบุ dbName = ใช้ default database (databaseConfig)
    return defaultDataSource;
  }
  
  // ระบุ dbName = ใช้ createDataSourceConfig
  const cacheKey = dbName;
  
  if (!dataSourceCache.has(cacheKey)) {
    const newDataSource = new DataSource(createDataSourceConfig(dbName));
    dataSourceCache.set(cacheKey, newDataSource);
  }
  
  return dataSourceCache.get(cacheKey)!;
};

// Export default DataSource for CLI tools
export default AppDataSource;

// Specific DataSources for convenience
export const Db1DataSource = () => AppDataSource('db1');
export const Db2DataSource = () => AppDataSource('db2');

// Factory function สำหรับสร้าง DataSource ใหม่ (legacy support)
export const createDataSource = (dbName: string) => {
  return AppDataSource(dbName);
};