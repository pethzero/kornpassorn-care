// โหลดไฟล์ .env.<NODE_ENV> เข้า process.env "ก่อน" ไฟล์อื่นถูก import
//
// ทำไมต้องมี: config หลายตัว (เช่น database.config.ts) อ่าน process.env ตอนถูก import
// ซึ่งเกิดก่อน ConfigModule.forRoot() จะโหลดไฟล์ .env — เดิมจึงได้ค่า default ในโค้ดเสมอ
// (DB = postgres, sync เปิด) ไม่ว่าจะตั้งอะไรไว้ใน .env.dev / .env.production
//
// ใช้: import './config/load-env' เป็นบรรทัดแรกของ main.ts และของ scripts/*
//   NODE_ENV=dev (ค่าเริ่มต้น) → .env.dev
//   NODE_ENV=production        → .env.production
// ค่าที่ตั้งไว้ใน environment จริงอยู่แล้ว (เช่น NODE_ENV จาก cross-env) จะไม่ถูกทับ
import * as fs from 'fs';
import * as path from 'path';

const envName = process.env.NODE_ENV || 'dev';
const file = path.join(__dirname, '..', '..', `.env.${envName}`);

if (fs.existsSync(file)) {
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
} else {
  console.warn(`[load-env] ไม่พบไฟล์ ${file} — ใช้ค่า default ในโค้ด`);
}

export const LOADED_ENV = envName;
