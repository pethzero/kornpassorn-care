// อัปเดตโครงสร้างตารางของฐานข้อมูล PRD ให้ตรงกับ entity ในโค้ด — แบบปลอดภัย
//
//   cd backend && npm run db:prod:sync          (task "🏭 PRD" เรียกให้อัตโนมัติก่อนเปิดเซิร์ฟเวอร์)
//
// ขั้นตอน:
//   1) คำนวณ SQL ที่ต้องรัน (ยังไม่แตะฐานข้อมูล)
//   2) backup ทุกตารางเป็น JSON ที่ database/backup/prod-<เวลา>/
//   3) ทำเฉพาะคำสั่งที่ "เพิ่ม" (ตาราง/คอลัมน์/index ใหม่) — คำสั่งที่ "ลบ" คอลัมน์/ตาราง จะข้ามและแจ้งไว้
//      ลบจริง (หลัง deploy โค้ดใหม่ที่ไม่ใช้คอลัมน์นั้นแล้ว): npm run db:prod:sync -- --allow-drop
//   ดูอย่างเดียวไม่แก้: npm run db:prod:check (--dry-run)
//
// ทำไมแยก "เพิ่ม" กับ "ลบ": ระหว่างรอ deploy โค้ดเก่ายังใช้คอลัมน์เดิมอยู่ ถ้าลบก่อนจะพัง — เพิ่มก่อน ลบทีหลังเสมอ
//
// PRD ปิด DB_SYNC (แอปไม่แก้โครงสร้างเองตอน start) — โครงสร้างเปลี่ยนผ่านสคริปต์นี้เท่านั้น
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
import '../src/config/load-env';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { DEFAULT_DB_CONFIG } from '../src/config/database.config';

const DESTRUCTIVE = /\b(DROP\s+TABLE|DROP\s+COLUMN)\b/i;

async function main() {
  const allowDrop = process.argv.includes('--allow-drop');
  const dryRun = process.argv.includes('--dry-run');
  const ds = new DataSource({ ...(DEFAULT_DB_CONFIG as any), synchronize: false, logging: false });
  await ds.initialize();
  const dbName = (DEFAULT_DB_CONFIG as any).database;
  console.log(`database: "${dbName}" (${process.env.NODE_ENV})`);

  try {
    const pending = await ds.driver.createSchemaBuilder().log();
    const queries = pending.upQueries.map((q) => q.query);
    if (queries.length === 0) {
      console.log('✔ โครงสร้างตรงกับโค้ดอยู่แล้ว ไม่มีอะไรต้องเปลี่ยน');
      return;
    }

    const destructive = queries.filter((q) => DESTRUCTIVE.test(q));
    console.log(`พบการเปลี่ยนแปลง ${queries.length} คำสั่ง${destructive.length ? ` (ลบ ${destructive.length})` : ''}:`);
    queries.forEach((q) => console.log(`  ${DESTRUCTIVE.test(q) ? '⚠ ' : '· '}${q.length > 160 ? q.slice(0, 160) + '…' : q}`));

    if (dryRun) {
      console.log('\n(ดูอย่างเดียว — ยังไม่ได้แก้อะไร) รัน npm run db:prod:sync เพื่ออัปเดตจริง');
      return;
    }

    if (allowDrop) {
      await backupAll(ds);
      await ds.synchronize();
      console.log('✔ อัปเดตโครงสร้างเรียบร้อย (รวมคำสั่งลบ)');
      return;
    }

    const safe = queries.filter((q) => !DESTRUCTIVE.test(q));
    if (safe.length) {
      await backupAll(ds);
      const runner = ds.createQueryRunner();
      await runner.startTransaction();
      try {
        for (const q of safe) await runner.query(q);
        await runner.commitTransaction();
      } catch (e) {
        await runner.rollbackTransaction();
        throw e;
      } finally {
        await runner.release();
      }
      console.log(`✔ อัปเดตโครงสร้างเรียบร้อย (${safe.length} คำสั่ง)`);
    }
    if (destructive.length) {
      console.log(
        `\nℹ ข้ามคำสั่งลบ ${destructive.length} คำสั่ง (⚠ ด้านบน) — ไม่กระทบการใช้งาน\n` +
          '  ลบจริงหลัง deploy โค้ดใหม่แล้ว: npm run db:prod:sync -- --allow-drop (Supabase: db:cloud:sync -- --allow-drop)',
      );
    }
  } finally {
    await ds.destroy();
  }
}

// backup ทุกตารางเป็น JSON ก่อนเปลี่ยนโครงสร้าง → database/backup/prod-<เวลา>/ (ไม่ขึ้น git)
async function backupAll(ds: DataSource) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir = path.join(__dirname, '..', '..', 'database', 'backup', `prod-${stamp}`);
  fs.mkdirSync(dir, { recursive: true });
  const tables: { table_name: string }[] = await ds.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
  );
  for (const { table_name } of tables) {
    const rows = await ds.query(`SELECT * FROM "${table_name}"`);
    fs.writeFileSync(path.join(dir, `${table_name}.json`), JSON.stringify(rows, null, 2));
  }
  console.log(`backup ${tables.length} ตาราง → ${path.relative(process.cwd(), dir)}`);
}

main().catch((err) => {
  console.error('✖ FAILED:', err.message);
  process.exit(1);
});
