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
      // ถ้า login แล้ว ให้ redirect ไปหน้า dashboard หรืออื่น ๆ ตาม role
    //   if (user.role === 'admin') {
    //     this.router.navigate(['/admin/dashboard']);
    //   } else {
    //     this.router.navigate(['/dashboard']);
    //   }
    this.router.navigate(['/dashboard']);
      return false;
    }
    return true; // ถ้ายังไม่ login, เข้า login page ได้ตามปกติ
  }
}
