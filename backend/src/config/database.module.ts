
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Config } from './index';
import { getEntitiesForTypeOrm } from './entity-registry';

/**
 * Connection options มาจาก config/database.config.ts (อ่านจาก ENV)
 * หากต้องการเพิ่ม connection อื่น (multi-db):
 *  1. Uncomment config ที่ต้องการใน config/database.config.ts
 *  2. เพิ่ม entities ของ connection นั้นใน entity-registry.ts (DATABASE_ENTITIES)
 *  3. Uncomment forRoot/forFeature คู่กันด้านล่าง
 */
@Module({
  imports: [
    // Default (unnamed) connection
    TypeOrmModule.forRoot(Config.database.DEFAULT_DB_CONFIG),
    // Register repositories for default connection
    TypeOrmModule.forFeature(getEntitiesForTypeOrm('default')),

    // --- ตัวอย่าง connection เพิ่มเติม (multi-db) — ยังไม่เปิดใช้งาน ---
    // TypeOrmModule.forRoot(Config.database.MYSQL_DB_CONFIG),
    // TypeOrmModule.forFeature(getEntitiesForTypeOrm('db1'), 'mysql'),

    // TypeOrmModule.forRoot(Config.database.DB2_CONFIG),
    // TypeOrmModule.forFeature(getEntitiesForTypeOrm('db2'), 'db2'),
  ],
  providers: [],
  exports: [TypeOrmModule],
})
export class DatabaseModule { }