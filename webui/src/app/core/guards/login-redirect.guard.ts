// guards/login-redirect.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class LoginRedirectGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean {
    const user = this.auth.getCurrentUser();
    if (user) {
      // login อยู่แล้ว ไม่ต้องเข้าหน้า login ซ้ำ
      // patient/guest ไม่มีสิทธิ์เข้า /dashboard (เฉพาะ user/admin) ต้องส่งไปหน้าของตัวเองแทน
      // ไม่งั้นจะโดน AuthGuard เด้งต่อไป /unauthorized
      let target = '/dashboard';
      if (user.role === 'patient') target = '/portal/dashboard';
      else if (user.role === 'guest') target = '/guest-dashboard';
      this.router.navigate([target]);
      return false;
    }
    return true; // ถ้ายังไม่ login, เข้า login page ได้ตามปกติ
  }
}
