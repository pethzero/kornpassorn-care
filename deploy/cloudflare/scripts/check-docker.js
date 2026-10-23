// ตรวจว่า Docker Desktop เปิดอยู่ก่อนสั่ง docker build/run — ให้ error อ่านรู้เรื่องแทน "pipe/docker_engine ... cannot find the file"
const { execSync } = require('child_process');

try {
  execSync('docker info', { stdio: 'ignore', timeout: 20000 });
} catch {
  console.error('\n✖ Docker Desktop ยังไม่ได้เปิด (หรือยังเปิดไม่เสร็จ)');
  console.error('  เปิด Docker Desktop → รอจนขึ้น "Engine running" แล้วรัน task นี้ใหม่\n');
  process.exit(1);
}
