import { Request, Response, NextFunction } from 'express';
import { csrfProtection } from './csrf.middleware';

// 🔒 รายการ path/method ที่ต้องการให้ใช้ CSRF Protection (เฉพาะตัวที่กำหนด)
const requireCsrf: { path: RegExp; method: string }[] = [
  { path: /^\/api\/patients/, method: 'ANY' }, // 🔒 /api/patients/* ทุก method ต้องใช้ CSRF
  // เพิ่มตัวอื่นๆ ที่ต้องการ CSRF protection ตรงนี้
  // { path: /^\/api\/auth\/token$/, method: 'POST' }, // 🔒 POST /api/auth/token ต้องใช้ CSRF
  // { path: /^\/api\/admin/, method: 'ANY' },
  // { path: /^\/api\/sensitive/, method: 'ANY' },
];

export function csrfExcludeMiddleware(req: Request, res: Response, next: NextFunction) {
  // ตรวจสอบว่าเป็น API ที่ต้องใช้ CSRF หรือไม่
  const shouldRequireCsrf = requireCsrf.some(
    rule =>
      (rule.method === req.method || rule.method === 'ANY') &&
      rule.path.test(req.path)
  );

  // ถ้าต้องใช้ CSRF ให้เรียก CSRF protection
  if (shouldRequireCsrf) {
    return csrfProtection(req, res, next);
  }

  // Default: ไม่ใช้ CSRF protection (ส่วนใหญ่ทุก API จะผ่านไปเลย)
  return next();
}