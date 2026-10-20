// ย้ายข้อมูลจากฐานข้อมูลในเครื่อง → Supabase (คู่มือ: database/SUPABASE_README.md)
//
//   cd backend && npm run db:cloud:push                  ครั้งแรก: Supabase ต้องยังไม่มีข้อมูล
//   cd backend && npm run db:cloud:push -- --replace     เขียนทับข้อมูลบน Supabase ทั้งหมด (backup ของบนคลาวด์ให้ก่อน)
//   cd backend && npm run db:cloud:push -- --from-dev    ใช้ kornpassorn_db_dev เป็นต้นทาง (ค่าเริ่มต้น = PRD kornpassorn_db)
//
// ขั้นตอน: อัปเดตโครงสร้างตารางบน Supabase ให้ตรงโค้ด → dump ข้อมูลต้นทาง → ใส่ขึ้น Supabase ใน transaction เดียว
//          (พังกลางทาง = ยกเลิกทั้งหมด) → เทียบจำนวนแถวทุกตาราง → ลบไฟล์ dump (มีข้อมูลคนไข้)
// ค่าเชื่อมต่อ: ต้นทาง backend/.env.production (หรือ .env.dev) · ปลายทาง backend/.env.supabase
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const { Client } = require('pg');

const BACKEND = path.join(__dirname, '..');
const BACKUP_DIR = path.join(BACKEND, '..', 'database', 'backup');
const replace = process.argv.includes('--replace');
const fromDev = process.argv.includes('--from-dev');

function readEnv(file) {
  const full = path.join(BACKEND, file);
  if (!fs.existsSync(full)) fail(`ไม่พบไฟล์ backend/${file}`);
  const env = {};
  for (const line of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return env;
}

function fail(msg) {
  console.error(`\n✖ ${msg}`);
  process.exit(1);
}

function findPgTool(name) {
  const onPath = spawnSync(process.platform === 'win32' ? 'where' : 'which', [name], { encoding: 'utf8' });
  if (onPath.status === 0) return onPath.stdout.split(/\r?\n/)[0].trim();
  const root = 'C:\\Program Files\\PostgreSQL';
  if (fs.existsSync(root)) {
    for (const v of fs.readdirSync(root).filter((x) => /^\d+$/.test(x)).sort((a, b) => b - a)) {
      const exe = path.join(root, v, 'bin', `${name}.exe`);
      if (fs.existsSync(exe)) return exe;
    }
  }
  fail(`ไม่พบ ${name} — ติดตั้ง PostgreSQL หรือเพิ่มโฟลเดอร์ bin ลง PATH`);
}

// ค่าเชื่อมต่อส่งผ่าน environment (PG*) — รหัสผ่านไม่โผล่ในคำสั่ง/ประวัติ
function pgEnv(e) {
  const env = { ...process.env, PGHOST: e.DB_HOST, PGPORT: String(e.DB_PORT || 5432), PGUSER: e.DB_USER, PGPASSWORD: e.DB_PASS, PGDATABASE: e.DB_NAME };
  if (String(e.DB_SSL).toLowerCase() === 'true') {
    env.PGSSLMODE = e.DB_SSL_CA ? 'verify-full' : 'require';
    if (e.DB_SSL_CA) env.PGSSLROOTCERT = path.resolve(BACKEND, e.DB_SSL_CA);
  }
  return env;
}

function client(e) {
  const ssl = String(e.DB_SSL).toLowerCase() === 'true'
    ? { rejectUnauthorized: true, ...(e.DB_SSL_CA ? { ca: fs.readFileSync(path.resolve(BACKEND, e.DB_SSL_CA), 'utf8') } : {}) }
    : false;
  return new Client({ host: e.DB_HOST, port: Number(e.DB_PORT || 5432), user: e.DB_USER, password: e.DB_PASS, database: e.DB_NAME, ssl });
}

async function counts(c) {
  const tables = (await c.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY 1`,
  )).rows.map((r) => r.table_name);
  const out = {};
  for (const t of tables) out[t] = Number((await c.query(`SELECT count(*) FROM "${t}"`)).rows[0].count);
  return out;
}

function run(exe, args, env, label) {
  const r = spawnSync(exe, args, { env, stdio: ['ignore', 'inherit', 'inherit'], cwd: BACKEND, shell: false });
  if (r.status !== 0) fail(`${label} ไม่สำเร็จ`);
}

async function main() {
  const source = readEnv(fromDev ? '.env.dev' : '.env.production');
  const target = readEnv('.env.supabase');

  // กันพลาด: ต้นทางต้องเป็น DB ในเครื่อง ปลายทางต้องเป็นคลาวด์
  if (!['kornpassorn_db', 'kornpassorn_db_dev'].includes(source.DB_NAME)) fail(`ต้นทางไม่ใช่ฐานข้อมูลของโปรเจกต์: ${source.DB_NAME}`);
  if (!target.DB_HOST || /^(localhost|127\.)/.test(target.DB_HOST)) fail('ปลายทาง (.env.supabase) ต้องเป็นฐานข้อมูลบนคลาวด์ ไม่ใช่ localhost');
  if (!target.DB_PASS) fail('ยังไม่ได้ใส่ DB_PASS ใน backend/.env.supabase');

  console.log(`ต้นทาง : ${source.DB_NAME} @ ${source.DB_HOST}`);
  console.log(`ปลายทาง: ${target.DB_NAME} @ ${target.DB_HOST}${replace ? '  (เขียนทับ)' : ''}\n`);

  // 1) โครงสร้างตารางบน Supabase ให้ตรงกับโค้ด (ใช้สคริปต์เดียวกับ PRD — ถ้าจะลบคอลัมน์/ตาราง จะหยุดเอง)
  console.log('① อัปเดตโครงสร้างตาราง');
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const sync = spawnSync(npx, ['ts-node', '--transpile-only', 'scripts/prod-db-sync.ts'], {
    cwd: BACKEND, stdio: 'inherit', shell: process.platform === 'win32', env: { ...process.env, NODE_ENV: 'supabase' },
  });
  if (sync.status !== 0) fail('อัปเดตโครงสร้างไม่สำเร็จ');

  // 2) ปลายทางต้องว่าง (ไม่งั้นข้อมูลชนกัน) — เว้นแต่สั่ง --replace
  const cloud = client(target);
  await cloud.connect();
  let before;
  try {
    before = await counts(cloud);
  } finally {
    await cloud.end();
  }
  const used = Object.entries(before).filter(([, n]) => n > 0);
  if (used.length && !replace) {
    fail(
      `Supabase มีข้อมูลอยู่แล้ว (${used.map(([t, n]) => `${t} ${n}`).join(', ')})\n` +
        '  ถ้าต้องการเขียนทับด้วยข้อมูลในเครื่อง: npm run db:cloud:push -- --replace  (backup ของบนคลาวด์ให้ก่อน)',
    );
  }

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dump = path.join(BACKUP_DIR, `to-cloud-${stamp}.sql`);
  const pgDump = findPgTool('pg_dump');
  const psql = findPgTool('psql');

  try {
    // 3) --replace: backup ข้อมูลบนคลาวด์ก่อนทับ
    if (replace && used.length) {
      const cloudBackup = path.join(BACKUP_DIR, `supabase-before-replace-${stamp}.sql`);
      console.log('\n② backup ข้อมูลบน Supabase ก่อนเขียนทับ');
      run(pgDump, ['--data-only', '--schema=public', '--no-owner', '--no-privileges', '-f', cloudBackup], pgEnv(target), 'backup Supabase');
      console.log(`   → ${path.relative(process.cwd(), cloudBackup)}`);
    }

    // 4) dump เฉพาะข้อมูลจากต้นทาง
    console.log(`\n③ ดึงข้อมูลจาก ${source.DB_NAME}`);
    run(pgDump, ['--data-only', '--no-owner', '--no-privileges', '-f', dump], pgEnv(source), 'pg_dump');
    if (replace) {
      // ล้างตารางบนคลาวด์ในไฟล์เดียวกัน → ล้าง + ใส่ใหม่อยู่ใน transaction เดียว (พัง = ไม่มีอะไรเปลี่ยน)
      const list = Object.keys(before).map((t) => `"${t}"`).join(', ');
      fs.writeFileSync(dump, `TRUNCATE ${list} RESTART IDENTITY CASCADE;\n` + fs.readFileSync(dump, 'utf8'));
    }

    // 5) ใส่ขึ้น Supabase — transaction เดียว หยุดที่ error แรก
    console.log('\n④ ส่งข้อมูลขึ้น Supabase');
    run(psql, ['-v', 'ON_ERROR_STOP=1', '--single-transaction', '-q', '-o', process.platform === 'win32' ? 'NUL' : '/dev/null', '-f', dump], pgEnv(target), 'นำเข้าข้อมูล');

    // 6) เทียบจำนวนแถว
    console.log('\n⑤ เทียบจำนวนแถว');
    const src = client(source);
    const dst = client(target);
    await src.connect();
    await dst.connect();
    let a, b;
    try {
      [a, b] = [await counts(src), await counts(dst)];
    } finally {
      await src.end();
      await dst.end();
    }
    let bad = 0;
    for (const t of Object.keys(a)) {
      const ok = a[t] === b[t];
      if (!ok) bad++;
      console.log(`   ${ok ? '✓' : '✗'} ${t.padEnd(30)} ${String(a[t]).padStart(5)} → ${b[t] ?? '-'}`);
    }
    if (bad) fail(`จำนวนแถวไม่ตรง ${bad} ตาราง`);
    console.log(`\n✔ ย้ายข้อมูลขึ้น Supabase เรียบร้อย (${Object.keys(a).length} ตาราง)`);
  } finally {
    // ไฟล์ dump มีข้อมูลคนไข้ — ลบทุกกรณี
    if (fs.existsSync(dump)) fs.unlinkSync(dump);
  }
}

main().catch((err) => fail(err.message));
