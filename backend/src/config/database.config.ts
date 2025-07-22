import { TypeOrmModuleOptions } from '@nestjs/typeorm';

const databaseConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres', // ต้องเป็น 'postgres' ไม่ใช่ string ธรรมดา
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '123456',
  database: process.env.DB_NAME || 'postgres',
  autoLoadEntities: true,
  synchronize: true,
});

export default databaseConfig;