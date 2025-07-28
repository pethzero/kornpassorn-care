import { Request, Response, NextFunction } from 'express';
import { csrfProtection } from './csrf.middleware';

// รายการ path/method ที่ต้องการ skip CSRF (รองรับ dynamic path ด้วย RegExp)
const skipCsrf: { path: RegExp; method: string }[] = [
  { path: /^\/api\/auth\/login$/, method: 'POST' },
  { path: /^\/api\/patients\/upsert$/, method: 'POST' },
  { path: /^\/api\/patients\/\d+$/, method: 'PUT' },
  { path: /^\/api\/openapi/, method: 'ANY' }, // <-- skip ทุก method ที่ขึ้นต้นด้วย /api/openapi
  // { path: /^\/api\/patients$/, method: 'GET' }, // <-- เพิ่ม GET /api/patients
  // ... เพิ่มได้
];

export function csrfExcludeMiddleware(req: Request, res: Response, next: NextFunction) {
  const shouldSkip = skipCsrf.some(
    rule =>
      (rule.method === req.method || rule.method === 'ANY') &&
      rule.path.test(req.path)
  );
  if (shouldSkip) return next();
  csrfProtection(req, res, next);
}