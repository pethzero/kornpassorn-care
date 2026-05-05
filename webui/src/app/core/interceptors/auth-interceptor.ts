// src/app/core/interceptors/auth-interceptor.ts
import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');

  // Skip endpoints ที่ไม่ต้องใส่ token
  const skipUrls = ['/auth/login', '/auth/guest', '/auth/csrf-token'];
  if (skipUrls.some(url => req.url.includes(url))) {
    return next(req);
  }

  // สร้าง headers
  const headersConfig: Record<string, string> = {};
  if (token) {
    headersConfig['Authorization'] = `Bearer ${token}`;
  }

  // clone request และแนบ headers + withCredentials
  const authReq: HttpRequest<any> = req.clone({
    setHeaders: headersConfig,
    withCredentials: true, // ถ้า backend ใช้ cookie + CSRF
  });

  return next(authReq);
};
