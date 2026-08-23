// src/app/core/interceptors/auth-interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';

const RETRIED_HEADER = 'X-Retried-After-Refresh';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  const token = localStorage.getItem('token');

  const skipUrls = ['/auth/login', '/auth/guest', '/auth/csrf-token', '/auth/refresh'];
  if (skipUrls.some(url => req.url.includes(url))) {
    return next(req);
  }

  const headersConfig: Record<string, string> = {};
  if (token) {
    headersConfig['Authorization'] = `Bearer ${token}`;
  }

  const authReq = req.clone({
    setHeaders: headersConfig,
    withCredentials: true,
  });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // เคยลอง refresh+retry ไปแล้วรอบนึง ยัง 401 อีก แปลว่าไม่ใช่แค่ access token หมดอายุ -> เลิกลอง กัน loop ไม่รู้จบ
      if (error.status !== 401 || authReq.headers.has(RETRIED_HEADER)) {
        return throwError(() => error);
      }

      // AuthService.refreshToken() แชร์ request เดียวกันให้ทุกคนที่เรียกพร้อมกันอยู่แล้ว (shareReplay)
      // ไม่ว่าจะมีกี่ request 401 พร้อมกัน ก็ยิง /auth/refresh แค่ครั้งเดียว แล้วทุกคนได้ผลลัพธ์เดียวกัน
      // ไม่ต้องมี queue/flag แยกต่างหากในไฟล์นี้ ที่พลาดง่ายเวลา error (request ที่รออยู่ค้างตลอดไปไม่ reject)
      return authService.refreshToken().pipe(
        switchMap((newToken: string) => {
          const retryReq = req.clone({
            setHeaders: { Authorization: `Bearer ${newToken}`, [RETRIED_HEADER]: '1' },
            withCredentials: true,
          });
          return next(retryReq);
        }),
        catchError(err => {
          // backend ยืนยันว่า refresh token ใช้ไม่ได้จริง (401) → session ตายจริง ต้อง logout
          // ไม่งั้น token ที่ตายแล้วจะค้างใน localStorage แล้วทุก request ถัดไปก็จะวน 401 ซ้ำไปเรื่อยๆ
          // ส่วน error อื่น (server ไม่ตอบ/network ล่มชั่วคราว) ไม่ควรเคลียร์ session ที่ยัง valid อยู่
          if (err instanceof HttpErrorResponse && err.status === 401) {
            authService.logout(() => {
              router.navigate(['/login']);
            });
          }
          return throwError(() => err);
        })
      );
    })
  );
};
