// รันไฟล์ .sql ในโฟลเดอร์ database/ กับฐานข้อมูลตาม backend/.env (ไม่ต้องติดตั้ง psql)
// ใช้ผ่าน npm:  npm run db:seed  /  npm run db:demo
// หรือตรงๆ:     node scripts/run-sql.js ../database/a.sql ../database/b.sql
//
// ต้องสตาร์ท backend อย่างน้อย 1 ครั้งก่อน (DB_SYNC=true) เพื่อให้ TypeORM สร้างตารางให้
const path = require('path');
const fs = require('fs');
const { Client } = require('pg');

// อ่าน backend/.env.<NODE_ENV> (เหมือนแอป — ดู src/config/load-env.ts) โดยไม่พึ่ง dotenv — ค่าใน environment จริงมาก่อน
const envFile = path.join(__dirname, '..', `.env.${process.env.NODE_ENV || 'dev'}`);
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
}

async function main() {
  const files = process.argv.slice(2);
  // กันพลาด: ไฟล์ seed ล้างข้อมูล — ห้ามรันกับ production
  if (process.env.NODE_ENV === 'production' || process.env.DB_NAME === 'kornpassorn_db') {
    console.error(`✖ ไม่รัน seed กับฐานข้อมูล production (${process.env.DB_NAME})`);
    process.exit(1);
  }
  if (files.length === 0) {
    console.error('usage: node scripts/run-sql.js <file.sql> [...more.sql]');
    process.exit(1);
  }

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || '123456',
    database: process.env.DB_NAME || 'kornpassorn_db_dev',
  });
  await client.connect();

  try {
    for (const file of files) {
      const fullPath = path.resolve(process.cwd(), file);
      console.log(`\n▶ ${path.relative(process.cwd(), fullPath)}  → database "${process.env.DB_NAME || 'kornpassorn_db_dev'}"`);
      const result = await client.query(fs.readFileSync(fullPath, 'utf8'));
      // multi-statement คืนเป็น array — โชว์ผลของ SELECT ตัวสุดท้าย (ส่วน "ตรวจผล" ท้ายไฟล์)
      const last = [].concat(result).pop();
      if (last?.rows?.length) console.table(last.rows);
    }
    console.log('\n✔ เสร็จแล้ว');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('✖ FAILED:', err.message);
  process.exit(1);
});
