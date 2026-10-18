// อัปเดตโครงสร้างตารางของฐานข้อมูล PRD ให้ตรงกับ entity ในโค้ด — แบบปลอดภัย
//
//   cd backend && npm run db:prod:sync          (task "🏭 PRD" เรียกให้อัตโนมัติก่อนเปิดเซิร์ฟเวอร์)
//
// ขั้นตอน:
//   1) คำนวณ SQL ที่ต้องรัน (ยังไม่แตะฐานข้อมูล)
//   2) ถ้ามีคำสั่งที่ "ลบ" คอลัมน์/ตาราง → หยุด แสดงรายการ ไม่ทำอะไร (กันข้อมูลหาย)
//      ยืนยันว่าตั้งใจลบจริง: npm run db:prod:sync -- --allow-drop
//   ดูอย่างเดียวไม่แก้: npm run db:prod:check (--dry-run)
//   3) backup ทุกตารางเป็น JSON ที่ database/backup/prod-<เวลา>/ แล้วค่อยรัน SQL
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

    if (destructive.length && !allowDrop) {
      console.error(
        '\n✖ หยุดไว้ก่อน: มีคำสั่งที่จะลบคอลัมน์/ตาราง (ข้อมูลในนั้นจะหาย)\n' +
          '  ถ้าตั้งใจจริง (เช่น เปลี่ยนชื่อ field ใน entity) ให้ backup แล้วรัน: npm run db:prod:sync -- --allow-drop',
      );
      process.exitCode = 1;
      return;
    }

    // backup ทุกตารางก่อนเปลี่ยน
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

    await ds.synchronize();
    console.log('✔ อัปเดตโครงสร้างเรียบร้อย');
  } finally {
    await ds.destroy();
  }
}

main().catch((err) => {
  console.error('✖ FAILED:', err.message);
  process.exit(1);
});
