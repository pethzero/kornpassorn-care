
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

    // ตัวอย่าง: เพิ่ม connection ที่สอง (commented) — uncomment และปรับค่าเมื่อจำเป็น
    /*
    TypeOrmModule.forRoot({
      ...defaultOptions,
      name: 'albumsConnection',          // ชื่อ connection (named)
      host: process.env.ALBUM_DB_HOST || 'album_db_host',
      database: process.env.ALBUM_DB_NAME || 'album_db',
      entities: [Album],                 // ต้อง import Album entity ข้างบนถ้าใช้
      // synchronize/logging: ปรับเฉพาะ connection นี้ได้
    }),
    */
  ],
  providers: [],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}