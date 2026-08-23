// auth-guard.ts
import { Injectable } from '@angular/core';
import { AuthService } from '../services/auth.service';
import {
  CanActivate,
  CanActivateChild,
  CanMatch,
  ActivatedRouteSnapshot,
  Route,
  Router,
  UrlSegment
} from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';


@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate, CanActivateChild, CanMatch {
  constructor(private authService: AuthService, private router: Router) { }
  canActivate(route: ActivatedRouteSnapshot): Observable<boolean> {
    // เดิม canActivate() ไม่เช็ค role เลย ทำให้ทุก route ที่ใช้ canActivate (dashboard/patient/finance)
    // เข้าได้หมดตราบมี token ไม่ว่า role ไหน ต่างจาก /admin/** ที่ใช้ canActivateChild แล้วบังคับ role จริง
    return this.checkAuth(route.data?.['roles']);
  }

  canActivateChild(childRoute: ActivatedRouteSnapshot): Observable<boolean> {
    return this.checkAuth(childRoute.data?.['roles']);
  }

  canMatch(route: Route, segments: UrlSegment[]): Observable<boolean> {
    return this.checkAuth(route.data?.['roles']);
  }

  // ถ้า access token ใน localStorage หมดอายุ ก่อนหน้านี้จะเด้งไป /login ทันที
  // โดยไม่เคยลอง refresh ผ่าน refresh_token cookie (httpOnly) เลย
  // ทำให้ "จำฉันไว้" ไม่มีผลตอนปิดเบราว์เซอร์แล้วเปิดใหม่ เพราะ interceptor จะ refresh ให้
  // ก็ต่อเมื่อมี HTTP call หลุดผ่าน guard ไปก่อนแล้วเท่านั้น
  private checkAuth(allowedRoles?: string[]): Observable<boolean> {
    const token = localStorage.getItem('token');
    const expiresAt = Number(localStorage.getItem('expires_at'));
    const hasValidAccessToken = !!token && (!expiresAt || Date.now() <= expiresAt);

    if (hasValidAccessToken) {
      return of(this.checkAccess(allowedRoles));
    }

    // access token หมดอายุแล้ว (เช่น ปิด/เปิด browser ใหม่) แต่ refresh_token cookie (httpOnly, จำฉันไว้)
    // อาจยัง valid อยู่ -> ลอง refresh ก่อนเสมอ ก่อนจะถือว่า session ตายจริงแล้วค่อย logout
    return this.authService.refreshToken().pipe(
      map(() => this.checkAccess(allowedRoles)),
      catchError((err) => {
        // ล้าง session + เด้งไป /login เฉพาะตอน backend ยืนยันจริงๆ ว่า refresh token ใช้ไม่ได้ (401)
        // error อื่น (server ไม่ตอบ, network ล่มชั่วคราว ฯลฯ) ไม่ควรทำลาย session ที่ยัง valid อยู่ หรือบังคับเด้งหน้า
        // แค่ไม่ปล่อยให้เข้า route นี้รอบนี้ (ครั้งหน้าที่ navigate/reload ก็ลอง refresh ใหม่ได้เอง)
        if (err instanceof HttpErrorResponse && err.status === 401) {
          this.authService.logout();
          this.router.navigate(['/login']);
        }
        return of(false);
      })
    );
  }

  private checkAccess(allowedRoles?: string[]): boolean {
    let user = this.authService.getCurrentUser();

    // ถ้ายังไม่มี user แต่ token ยังมีอยู่ ให้ decode
    if (!user) {
      const token = localStorage.getItem('token');
      const expiresAt = Number(localStorage.getItem('expires_at'));

      // expiresAt ว่าง = token ไม่มี exp (permanent, เช่น admin) ให้ถือว่ายัง valid ไม่ใช่หมดอายุ
      if (token && (!expiresAt || Date.now() < expiresAt)) {
        try {
          // decode token
          user = (this.authService as any).decodeToken(token);
          // เซ็ต currentUserSubject
          (this.authService as any).currentUserSubject.next(user);
        } catch (err) {
          console.error('[AuthGuard] Invalid token', err);
          this.authService.logout();
          this.router.navigate(['/login']);
          return false;
        }
      } else {
        // token หมดอายุ
        this.authService.logout();
        this.router.navigate(['/login']);
        return false;
      }
    }

    // ถ้า allowedRoles ไม่กำหนด -> เข้าได้
    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    // เช็ก role
    if (user && allowedRoles.includes(user.role)) {
      return true;
    }

    // ไม่ตรง role -> redirect unauthorized
    this.router.navigate(['/unauthorized']);
    return false;
  }


}