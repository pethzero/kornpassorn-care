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


@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate, CanActivateChild, CanMatch {
  constructor(private authService: AuthService, private router: Router) { }
  canActivate(): boolean {
    const token = localStorage.getItem('token');
    const expiresAt = Number(localStorage.getItem('expires_at'));

    // ถ้าไม่มี token หรือ token หมดอายุ
    if (!token || (expiresAt && Date.now() > expiresAt)) {
      this.authService.logout();
      this.router.navigate(['/login']);
      return false;
    }
    return true;
  }

  canActivateChild(childRoute: ActivatedRouteSnapshot): boolean {
    return this.checkAccess(childRoute.data?.['roles']);
  }

  canMatch(route: Route, segments: UrlSegment[]): boolean {
    return this.checkAccess(route.data?.['roles']);
  }

  private checkAccess(allowedRoles?: string[]): boolean {
    let user = this.authService.getCurrentUser();

    // ถ้ายังไม่มี user แต่ token ยังมีอยู่ ให้ decode
    if (!user) {
      const token = localStorage.getItem('token');
      const expiresAt = Number(localStorage.getItem('expires_at'));

      if (token && expiresAt && Date.now() < expiresAt) {
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