// src/app/core/interceptors/csrf-interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const csrfToken = authService.getCsrfToken();

  let headers = req.headers;
  if (csrfToken && ['POST', 'PUT', 'DELETE'].includes(req.method)) {
    headers = headers.set('X-CSRF-Token', csrfToken);
  }

  const cloned = req.clone({
    headers,
    withCredentials: true,  // ต้องเปิดให้ browser ส่ง cookie
  });

  return next(cloned);
};
