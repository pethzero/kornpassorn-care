export const parseBool = (v?: string) => String(v).toLowerCase() === 'true';
export const parseIntOr = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// แปลง '15m' / '7d' / '30d' เป็นจำนวนวินาที ใช้คำนวณ cookie maxAge / expired_at ร่วมกันทั้งไฟล์
export const parseExpiresIn = (str?: string): number => {
  if (!str) return 0;
  const match = str.match(/^(\d+)([dhms])$/);
  if (!match) return 0;
  const value = parseInt(match[1], 10);
  switch (match[2]) {
    case 'd': return value * 24 * 60 * 60;
    case 'h': return value * 60 * 60;
    case 'm': return value * 60;
    case 's': return value;
    default: return 0;
  }
};

// token/settings
// ADMIN_NEVER_EXPIRE: ใช้เป็น fallback flag ใน bearer-token strategy เท่านั้น (ยอมรับ token admin ที่หาไม่เจอใน DB)
export const ADMIN_NEVER_EXPIRE = parseBool(process.env.ADMIN_NEVER_EXPIRE);

// user (พนักงาน) — session ยาวเท่ากะทำงาน (24 ชม.) ต่ออายุอัตโนมัติได้ผ่าน /auth/refresh อยู่แล้วถ้าหมดอายุระหว่างใช้งาน
export const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || process.env.JWT_ACCESS_EXPIRY || '24h';
// admin — '0' = permanent (ไม่หมดอายุ), ค่าอื่นคือ duration เช่น '7d'
export const ADMIN_ACCESS_TOKEN_EXPIRES_IN = process.env.ADMIN_ACCESS_TOKEN_EXPIRES_IN ?? '0';
export const DEFAULT_ACCESS_EXPIRES = ACCESS_TOKEN_EXPIRES_IN;

// refresh token — เฉพาะ user/admin (guest ไม่มี refresh เพราะเป็น session สอบถามครั้งเดียว)
export const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || process.env.JWT_REFRESH_EXPIRY || '7d';
// ใช้เมื่อ user ติ๊ก "จำฉันไว้" ตอน login
export const REFRESH_TOKEN_REMEMBER_ME_EXPIRES_IN = process.env.REFRESH_TOKEN_REMEMBER_ME_EXPIRES_IN || '30d';

// token สำหรับ API user (/auth/token) — สั้นกว่า user ปกติเพราะเป็น machine-to-machine ไม่มี refresh cookie รองรับ
export const API_TOKEN_EXPIRES_IN = process.env.API_TOKEN_EXPIRES_IN || '1h';

// คำนวณอายุ access token ตาม role เป็น single source of truth (แทนการเช็ค ADMIN_NEVER_EXPIRE ซ้ำซ้อนที่จุดเรียกใช้)
export const resolveAccessTokenExpiresIn = (role?: string): string | undefined => {
  if (role === 'admin') {
    return ADMIN_ACCESS_TOKEN_EXPIRES_IN === '0' ? undefined : ADMIN_ACCESS_TOKEN_EXPIRES_IN;
  }
  return ACCESS_TOKEN_EXPIRES_IN;
};