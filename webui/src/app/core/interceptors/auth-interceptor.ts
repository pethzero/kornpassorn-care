// // src/app/core/interceptors/auth-interceptor.ts
// import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';

// export const authInterceptor: HttpInterceptorFn = (req, next) => {
//   const token = localStorage.getItem('token');

//   // Skip endpoints ที่ไม่ต้องใส่ token
//   const skipUrls = ['/auth/login', '/auth/guest', '/auth/csrf-token'];
//   if (skipUrls.some(url => req.url.includes(url))) {
//     return next(req);
//   }

//   // สร้าง headers
//   const headersConfig: Record<string, string> = {};
//   if (token) {
//     headersConfig['Authorization'] = `Bearer ${token}`;
//   }

//   // clone request และแนบ headers + withCredentials
//   const authReq: HttpRequest<any> = req.clone({
//     setHeaders: headersConfig,
//     withCredentials: true, // ถ้า backend ใช้ cookie + CSRF
//   });

//   return next(authReq);
// };
import { HttpInterceptorFn, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, switchMap, BehaviorSubject, filter, take } from 'rxjs';
import { AuthService } from '../services/auth.service'; // ✅ import

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService); // ✅ inject

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

      if (error.status === 401) {

        // 🔥 รอบแรก → ยิง refresh
        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null);

          return authService.refreshToken().pipe( // ✅ ใช้ service
            switchMap((newToken: string) => {
              isRefreshing = false;
              refreshTokenSubject.next(newToken);

              // 🔁 retry request
              const retryReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`,
                },
                withCredentials: true,
              });

              return next(retryReq);
            }),
            catchError(err => {
              isRefreshing = false;

              // ❌ refresh fail → logout
              authService.logout(() => {
                router.navigate(['/login']);
              });

              return throwError(() => err);
            })
          );
        }

        // 🔁 รอ refresh เสร็จ
        return refreshTokenSubject.pipe(
          filter(token => token !== null),
          take(1),
          switchMap(token => {
            const retryReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${token!}`,
              },
              withCredentials: true,
            });
            return next(retryReq);
          })
        );
      }

      return throwError(() => error);
    })
  );
};