// backup ฐานข้อมูลเป็นไฟล์ .sql ด้วย pg_dump (กู้คืนด้วย psql ได้ทั้งไฟล์)
//
//   cd backend && npm run db:backup:dev     → database/backup/kornpassorn_db_dev-<วันเวลา>.sql
//   cd backend && npm run db:backup:prod    → database/backup/kornpassorn_db-<วันเวลา>.sql
//
// กู้คืน (ลงฐานข้อมูลว่าง):  psql -U postgres -d <ชื่อฐานข้อมูลใหม่> -f <ไฟล์.sql>
//
// อ่านค่าเชื่อมต่อจาก backend/.env.<NODE_ENV> (เหมือนแอป) — หา pg_dump จาก PATH ก่อน
// ถ้าไม่มี ใช้ตัวที่ติดตั้งใน C:\Program Files\PostgreSQL\<เวอร์ชันล่าสุด>\bin
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const envName = process.env.NODE_ENV || 'dev';
const envFile = path.join(__dirname, '..', `.env.${envName}`);
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

function findPgDump() {
  const onPath = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['pg_dump'], { encoding: 'utf8' });
  if (onPath.status === 0) return onPath.stdout.split(/\r?\n/)[0].trim();
  const root = 'C:\\Program Files\\PostgreSQL';
  if (fs.existsSync(root)) {
    const versions = fs.readdirSync(root).filter((v) => /^\d+$/.test(v)).sort((a, b) => Number(b) - Number(a));
    for (const v of versions) {
      const exe = path.join(root, v, 'bin', 'pg_dump.exe');
      if (fs.existsSync(exe)) return exe;
    }
  }
  return null;
}

const db = process.env.DB_NAME || 'kornpassorn_db_dev';
const pgDump = findPgDump();
if (!pgDump) {
  console.error('✖ ไม่พบ pg_dump — ติดตั้ง PostgreSQL client หรือเพิ่มโฟลเดอร์ bin ของ PostgreSQL ลง PATH');
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const dir = path.join(__dirname, '..', '..', 'database', 'backup');
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, `${db}-${stamp}.sql`);

console.log(`backup "${db}" (${envName}) ด้วย ${pgDump}`);
const result = spawnSync(
  pgDump,
  ['-h', process.env.DB_HOST || 'localhost', '-p', String(process.env.DB_PORT || 5432), '-U', process.env.DB_USER || 'postgres',
    '--no-owner', '--no-privileges', '--encoding=UTF8', '-f', file, db],
  { env: { ...process.env, PGPASSWORD: process.env.DB_PASS || '' }, stdio: ['ignore', 'inherit', 'inherit'] },
);
if (result.status !== 0) {
  console.error('✖ backup ไม่สำเร็จ');
  process.exit(result.status || 1);
}
const kb = Math.round(fs.statSync(file).size / 1024);
console.log(`✔ ${path.relative(process.cwd(), file)} (${kb} KB)`);
