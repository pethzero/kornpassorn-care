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
  constructor(private auth: AuthService, private router: Router) { }

  canActivate(route: ActivatedRouteSnapshot): boolean {
    return this.checkAccess(route.data?.['roles']);
  }

  canActivateChild(childRoute: ActivatedRouteSnapshot): boolean {
    return this.checkAccess(childRoute.data?.['roles']);
  }

  canMatch(route: Route, segments: UrlSegment[]): boolean {
    return this.checkAccess(route.data?.['roles']);
  }

  private checkAccess(allowedRoles?: string[]): boolean {
    const user = this.auth.getCurrentUser();

    if (!user) {
      this.router.navigate(['/login']);
      return false;
    }

    // // ตอนนี้ user มีค่าแน่นอน
    // if (user.role === 'admin') {
    //   this.router.navigate(['/admin-login']);
    //   return false;
    // }

    // ถ้าไม่ได้ระบุ allowedRoles (หรือว่าง) ถือว่าให้ user ที่ login เข้าได้
    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    if (allowedRoles.includes(user.role)) {
      return true;
    }

    this.router.navigate(['/unauthorized']);
    return false;
  }
}