import * as fs from 'fs';
import { parseBool, parseIntOr } from './token.config';
import { getEntitiesForTypeOrm } from './entity-registry';

// DB_SSL_CA: เนื้อหา PEM ตรงๆ (ใช้กับ secret บน Cloudflare — "\n" แบบตัวอักษรก็รับ) หรือ path ไฟล์ .crt
function readSslCa(value?: string): { ca?: string } {
  if (!value) return {};
  if (value.includes('-----BEGIN')) return { ca: value.replace(/\\n/g, '\n') };
  return { ca: fs.readFileSync(value, 'utf8') };
}

// Default (unnamed) connection — ใช้งานจริงตอนนี้
export const DEFAULT_DB_CONFIG = {
  type: 'postgres' as const,
  host: process.env.DB_HOST || 'localhost',
  port: parseIntOr(process.env.DB_PORT, 5432),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '123456',
  database: process.env.DB_NAME || 'kornpassorn_db_dev',
  synchronize: parseBool(process.env.DB_SYNC ?? 'true'),
  logging: parseBool(process.env.DB_LOGGING ?? 'false'),
  // Postgres บนคลาวด์ (Neon/Supabase ฯลฯ) บังคับ TLS — DB_SSL=true (เครื่อง local ปิดไว้)
  // Supabase เซ็นใบรับรองด้วย CA ของตัวเอง → ใส่ DB_SSL_CA (path ไฟล์ .crt หรือเนื้อหา PEM) ไม่งั้นต่อไม่ได้
  ssl: parseBool(process.env.DB_SSL ?? 'false') ? { rejectUnauthorized: true, ...readSslCa(process.env.DB_SSL_CA) } : false,
  entities: getEntitiesForTypeOrm('default'),
};

// เตรียมไว้สำหรับแผน multi-db ในอนาคต — uncomment เมื่อพร้อมต่อ connection จริง
// ต้องเพิ่ม entities ที่เกี่ยวข้องใน entity-registry.ts (DATABASE_ENTITIES) ด้วย

// export const MYSQL_DB_CONFIG = {
//   name: 'mysql',
//   type: 'mysql' as const,
//   host: process.env.MYSQL_HOST || 'localhost',
//   port: parseIntOr(process.env.MYSQL_PORT, 3306),
//   username: process.env.MYSQL_USER || 'root',
//   password: process.env.MYSQL_PASS || 'pass1234',
//   database: process.env.MYSQL_DB || 'mysql_db',
//   synchronize: parseBool(process.env.MYSQL_SYNC ?? 'true'),
//   logging: parseBool(process.env.MYSQL_LOGGING ?? 'false'),
//   entities: getEntitiesForTypeOrm('db1'),
// };

// export const DB2_CONFIG = {
//   name: 'db2',
//   type: 'postgres' as const,
//   host: process.env.DB2_HOST || 'localhost',
//   port: parseIntOr(process.env.DB2_PORT, 5432),
//   username: process.env.DB2_USER || 'postgres',
//   password: process.env.DB2_PASS || '123456',
//   database: process.env.DB2_NAME || 'postgres',
//   synchronize: parseBool(process.env.DB2_SYNC ?? 'true'),
//   logging: parseBool(process.env.DB2_LOGGING ?? 'false'),
//   entities: getEntitiesForTypeOrm('db2'),
// };
