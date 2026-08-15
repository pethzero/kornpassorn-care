
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getEntitiesForTypeOrm } from './entity-registry';

/**
 * Default options — อ่านจาก ENV ถ้ามี (ง่ายต่อการปรับ)
 * หากต้องการเพิ่ม connection อื่น ให้ดูตัวอย่างที่คอมเมนต์ไว้ด้านล่าง
 */
const defaultOptions = {
  type: 'postgres' as const,
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '123456',
  database: process.env.DB_NAME || 'postgres',
  synchronize: (process.env.DB_SYNC ?? 'true') === 'true',
  logging: (process.env.DB_LOGGING ?? 'false') === 'true',
  entities: getEntitiesForTypeOrm('default'),
  autoLoadEntities: true,
};

@Module({
  imports: [
    // Default (unnamed) connection
    TypeOrmModule.forRoot(defaultOptions),
    // Register repositories for default connection
    TypeOrmModule.forFeature(getEntitiesForTypeOrm('default')),

    // TypeOrmModule.forRoot({
    //   name: 'mysql',
    //   type: 'mysql',
    //   host: process.env.MYSQL_HOST || 'localhost',
    //   port: 3306,
    //   username: process.env.MYSQL_USER || 'root',
    //   password: process.env.MYSQL_PASS || 'pass1234',
    //   database: process.env.MYSQL_DB || 'mysql_db',
    //   entities: getEntitiesForTypeOrm('db1'),
    //   synchronize: true,
    //   logging: false,
    // }),

    // TypeOrmModule.forFeature(
    //   getEntitiesForTypeOrm('db1'),
    //   'mysql',
    // ),
  ],
  providers: [],
  exports: [TypeOrmModule],
})
export class DatabaseModule { }