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
    // Logging สำหรับ debug
    // console.log('[AuthGuard] user:', user, 'allowedRoles:', allowedRoles);

    if (!user) {
      // ป้องกัน redirect loop
      if (this.router.url !== '/login') {
        this.router.navigate(['/login']);
      }
      return false;
    }

    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    if (allowedRoles.includes(user.role)) {
      return true;
    }

    // ป้องกัน redirect loop
    if (this.router.url !== '/unauthorized') {
      this.router.navigate(['/unauthorized']);
    }
    return false;
  }
}