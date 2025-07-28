import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig = (dbName?: string): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '123456',
  database: dbName || process.env.DB_NAME || 'postgres',
  autoLoadEntities: true,
  synchronize: true,
});

export default databaseConfig;


// TypeOrmModule.forRoot(databaseConfig()), // default
// TypeOrmModule.forRoot({ ...databaseConfig('kornpassorn_db'),