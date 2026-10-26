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

// อายุ token — เหมือนกันทุก role (admin / เจ้าหน้าที่ / คนไข้):
//   access token  อายุสั้น ใช้เรียก API — หมดแล้วหน้าเว็บต่ออายุเองผ่าน /auth/refresh (ผู้ใช้ไม่รู้ตัว)
//   refresh token ใน httpOnly cookie = "อยู่ในระบบได้นานแค่ไหน" — ติ๊ก "จำฉันไว้" = นานขึ้น
// เดิม admin ได้ access "ถาวร" และ "จำฉันไว้" ไปยืด access token เป็น 30 วัน — ยกเลิกทั้งคู่ (ถูกขโมยไปใช้ได้นาน)
export const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || process.env.JWT_ACCESS_EXPIRY || '24h';
export const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || process.env.JWT_REFRESH_EXPIRY || '7d';
export const REFRESH_TOKEN_REMEMBER_ME_EXPIRES_IN = process.env.REFRESH_TOKEN_REMEMBER_ME_EXPIRES_IN || '30d';

// กันเดารหัสผ่าน: ผิดเกินจำนวนในช่วงเวลานี้ → พักการ login ชั่วคราว (ดู AuthService.loginLockedFor)
export const LOGIN_LOCK_WINDOW_MINUTES = parseIntOr(process.env.LOGIN_LOCK_WINDOW_MINUTES, 15);
export const LOGIN_MAX_FAILS_PER_USER = parseIntOr(process.env.LOGIN_MAX_FAILS_PER_USER, 5);
export const LOGIN_MAX_FAILS_PER_IP = parseIntOr(process.env.LOGIN_MAX_FAILS_PER_IP, 20);

// cleanup job: ลบแถวใน user_tokens ที่ตายแล้ว (revoked หรือหมดอายุ) ทิ้งเป็นระยะ กัน table โตไม่มีที่สิ้นสุด
export const TOKEN_CLEANUP_ENABLED = parseBool(process.env.TOKEN_CLEANUP_ENABLED ?? 'true');
// cron pattern มาตรฐาน 5 ช่อง (นาที ชม. วัน เดือน วันในสัปดาห์) — ค่า default รันทุกวันตีสาม
export const TOKEN_CLEANUP_CRON = process.env.TOKEN_CLEANUP_CRON || '0 3 * * *';
// เก็บ record ที่ตายแล้วไว้กี่วันก่อนลบจริง (ไว้สืบสวน/audit ย้อนหลังได้)
export const TOKEN_CLEANUP_RETENTION_DAYS = parseIntOr(process.env.TOKEN_CLEANUP_RETENTION_DAYS, 30);

// options ของ refresh_token cookie เป็น single source of truth ระหว่างจุด set/clear
// (ก่อนหน้านี้ copy ทับกัน 4 จุด แล้วมีจุดนึงลืม path:'/' ทำให้ clearCookie ไม่ลบ cookie จริง)
export const refreshCookieOptions = (maxAgeMs?: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  ...(maxAgeMs !== undefined ? { maxAge: maxAgeMs } : {}),
});