// สร้างชุดไฟล์ SQL พกพา (database/setup/) สำหรับติดตั้งฐานข้อมูล Kornpassorn Care ที่เครื่อง/เซิร์ฟเวอร์อื่น
// พร้อมผู้ใช้ตั้งต้น + ข้อมูลตัวอย่าง (demo)
//
//   cd backend && npm run db:build-setup
//
// ทำงานบนฐานข้อมูลชั่วคราว "kornpassorn_setup_tmp" (สร้างแล้วลบทิ้ง) — ไม่แตะ DEV/PRD
//   1) สร้างโครงสร้างตารางจาก entity ในโค้ด → 01_schema.sql
//   2) ใส่ผู้ใช้ตั้งต้น + เวลาทำการ → 02_base_data.sql
//   3) รัน scripts/seed-demo.ts (ผ่าน service จริง) → ดึงข้อมูลออกเป็น 03_demo_data.sql
//   4) รวมทั้งหมดเป็นไฟล์เดียว kornpassorn_setup_all.sql
// รันใหม่เมื่อไหร่ก็ได้ เมื่อโครงสร้างตารางเปลี่ยน หรืออยากได้วันที่ใน demo เป็นปัจจุบัน
process.env.NODE_ENV = process.env.NODE_ENV || 'dev';
import '../src/config/load-env';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as bcrypt from 'bcrypt';
import { Client } from 'pg';
import { DataSource } from 'typeorm';
import { DEFAULT_DB_CONFIG } from '../src/config/database.config';

const TMP_DB = 'kornpassorn_setup_tmp';
const OUT_DIR = path.join(__dirname, '..', '..', 'database', 'setup');

// ผู้ใช้ตั้งต้น (เปลี่ยนรหัสผ่านทันทีหลังติดตั้งบนเครื่องจริง)
const BASE_USERS = [
  { username: 'admin', password: 'admin1234', role: 'admin', first_name: 'ผู้ดูแลระบบ' },
  { username: 'user', password: '123456', role: 'user', first_name: 'เจ้าหน้าที่' },
];

// เวลาทำการตั้งต้น (จ.–ศ. 08:00–17:00, ส. 08:00–12:00, อา. ปิด)
const WEEKLY_HOURS = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
  day_of_week: day,
  is_closed: day === 0,
  open_time: day === 0 ? null : '08:00',
  close_time: day === 0 ? null : day === 6 ? '12:00' : '17:00',
}));

// ลำดับตารางตาม foreign key (ตารางแม่ก่อน) — ไม่รวม api_clients โดยตั้งใจ (ห้ามมีกุญแจ API ติดไปในไฟล์ที่แชร์)
const DATA_TABLES = [
  'users',
  'patients',
  'appointments',
  'hospital_weekly_hours',
  'hospital_special_days',
  'questionnaire_question',
  'inventory_products',
  'inventory_product_packages',
  'inventory_product_lots',
  'documents',
  'document_sequences',
  'document_items',
  'inventory_stock_movements',
  'finance_records',
];
const BASE_TABLES = new Set(['users', 'hospital_weekly_hours', 'hospital_special_days', 'questionnaire_question']);

const pgConfig = (database: string) => ({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '123456',
  database,
});

const header = (title: string, lines: string[] = []) =>
  [
    '-- =====================================================================================',
    `-- Kornpassorn Care — ${title}`,
    `-- สร้างโดย backend/scripts/build-db-setup.ts เมื่อ ${new Date().toISOString().slice(0, 10)} (อย่าแก้มือ — รันสคริปต์ใหม่แทน)`,
    ...lines.map((l) => `-- ${l}`),
    '-- =====================================================================================',
    '',
  ].join('\n');

// ข้อมูลแต่ละแถวส่งเป็น JSON แล้วให้ Postgres แปลงกลับตามชนิดคอลัมน์เอง (jsonb_populate_record)
// — ไม่ต้องจัดการเรื่องวันที่/timezone/ตัวเลขทศนิยมเอง และใช้ได้กับ PostgreSQL ทุกเวอร์ชันตั้งแต่ 9.4
async function dumpTable(client: Client, table: string): Promise<string> {
  const { rows } = await client.query(`SELECT to_jsonb(t) AS j FROM "${table}" t ORDER BY 1`);
  if (!rows.length) return '';
  const lines = rows.map(
    (r) =>
      `INSERT INTO "${table}" SELECT * FROM jsonb_populate_record(NULL::"${table}", '${JSON.stringify(r.j).replace(/'/g, "''")}');`,
  );
  const { rows: seq } = await client.query(`SELECT pg_get_serial_sequence($1, 'id') AS s`, [table]);
  if (seq[0]?.s) {
    lines.push(`SELECT setval('${seq[0].s}', COALESCE((SELECT MAX(id) FROM "${table}"), 0) + 1, false);`);
  }
  return `-- ${table} (${rows.length} แถว)\n${lines.join('\n')}\n`;
}

async function main() {
  const admin = new Client(pgConfig('postgres'));
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${TMP_DB}`);
  await admin.query(`CREATE DATABASE ${TMP_DB}`);
  console.log(`สร้างฐานข้อมูลชั่วคราว ${TMP_DB}`);

  try {
    // ---------- 1) โครงสร้างตาราง ----------
    const ds = new DataSource({ ...(DEFAULT_DB_CONFIG as any), database: TMP_DB, synchronize: false, logging: false });
    await ds.initialize();
    const schema = await ds.driver.createSchemaBuilder().log();
    const schemaSql = [
      header('01 โครงสร้างตาราง', ['รันกับฐานข้อมูลว่าง — สร้างตารางทั้งหมดที่แอปใช้']),
      'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";',
      '',
      ...schema.upQueries.map((q) => `${q.query.trim()};`),
      '',
    ].join('\n');
    await ds.synchronize();
    await ds.destroy();
    console.log(`โครงสร้าง ${schema.upQueries.length} คำสั่ง`);

    // ---------- 3) ข้อมูล demo (ผ่าน service จริง) ----------
    execSync('npx ts-node --transpile-only scripts/seed-demo.ts', {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, NODE_ENV: 'dev', DB_NAME: TMP_DB },
      stdio: ['ignore', 'ignore', 'inherit'],
    });
    console.log('ใส่ข้อมูล demo แล้ว');

    // ---------- 2) ผู้ใช้ + เวลาทำการ ----------
    const db = new Client(pgConfig(TMP_DB));
    // ตอนลบฐานข้อมูลชั่วคราว (finally) connection นี้จะถูกตัด — ไม่ให้ error นั้นทำให้สคริปต์ล้มทับ error จริง
    db.on('error', () => undefined);
    await db.connect();
    for (const u of BASE_USERS) {
      const hash = await bcrypt.hash(u.password, Number(process.env.BCRYPT_ROUNDS) || 10);
      await db.query(
        `INSERT INTO users (username, password_hash, role, first_name, "isActive") VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, "isActive" = true`,
        [u.username, hash, u.role, u.first_name],
      );
    }
    // แอปสร้างเวลาทำการตั้งต้นเองตอนบูต (ตอนรัน demo) — ใส่เฉพาะวันที่ยังไม่มี
    const existingDays = new Set(
      (await db.query('SELECT day_of_week FROM hospital_weekly_hours')).rows.map((r) => Number(r.day_of_week)),
    );
    for (const h of WEEKLY_HOURS.filter((x) => !existingDays.has(x.day_of_week))) {
      await db.query(
        `INSERT INTO hospital_weekly_hours (day_of_week, is_closed, open_time, close_time) VALUES ($1, $2, $3, $4)`,
        [h.day_of_week, h.is_closed, h.open_time, h.close_time],
      );
    }

    // ---------- ดึงข้อมูลออกเป็น SQL ----------
    let base = header('02 ข้อมูลตั้งต้น', [
      'ผู้ใช้: admin / admin1234 (admin), user / 123456 (user) — เปลี่ยนรหัสผ่านหลังติดตั้ง',
      'เวลาทำการ: จ.–ศ. 08:00–17:00, ส. 08:00–12:00, อา. ปิด',
    ]);
    let demo = header('03 ข้อมูลตัวอย่าง (demo) — ไม่ต้องรันบนเครื่องใช้งานจริง', [
      'สินค้าการแพทย์ 5 รายการ, คนไข้ตัวอย่าง 2 คน (DEMO-001/002), นัดหมาย 5 รายการ, เอกสาร 8 ใบ, บัญชีการเงิน',
      'วันที่ในข้อมูลอิงวันที่สร้างไฟล์นี้ — รันสคริปต์ใหม่ถ้าอยากให้เป็นปัจจุบัน',
    ]);
    const counts: Record<string, number> = {};
    for (const t of DATA_TABLES) {
      const sql = await dumpTable(db, t);
      counts[t] = Number((await db.query(`SELECT COUNT(*) FROM "${t}"`)).rows[0].count);
      if (!sql) continue;
      if (BASE_TABLES.has(t)) base += sql + '\n';
      else demo += sql + '\n';
    }
    await db.end();

    // ---------- เขียนไฟล์ ----------
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, '01_schema.sql'), schemaSql);
    fs.writeFileSync(path.join(OUT_DIR, '02_base_data.sql'), base);
    fs.writeFileSync(path.join(OUT_DIR, '03_demo_data.sql'), demo);
    fs.writeFileSync(
      path.join(OUT_DIR, 'kornpassorn_setup_all.sql'),
      [
        header('ติดตั้งครบในไฟล์เดียว (01 + 02 + 03)', ['psql -U postgres -d <ชื่อฐานข้อมูลว่าง> -f kornpassorn_setup_all.sql']),
        'BEGIN;',
        schemaSql,
        base,
        demo,
        'COMMIT;',
        '',
      ].join('\n'),
    );
    console.log(`\nเขียนไฟล์ → ${path.relative(process.cwd(), OUT_DIR)}`);
    console.table(counts);
  } finally {
    await admin.query(`DROP DATABASE IF EXISTS ${TMP_DB} WITH (FORCE)`);
    await admin.end();
    console.log(`ลบฐานข้อมูลชั่วคราว ${TMP_DB} แล้ว`);
  }
}

main().catch((err) => {
  console.error('✖ FAILED:', err.message);
  process.exit(1);
});
