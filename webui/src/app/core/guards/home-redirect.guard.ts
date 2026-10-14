// guards/home-redirect.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// path: '' เดิม redirectTo: 'dashboard' ตรงๆ ทำให้ guest/patient ที่เข้า '/' โดน AuthGuard
// เด้งไป /unauthorized เพราะ /dashboard จำกัดเฉพาะ role user/admin -> ใช้ guard นี้เลือกปลายทางตาม role แทน
@Injectable({ providedIn: 'root' })
export class HomeRedirectGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean {
    const user = this.auth.getCurrentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return false;
    }

    if (user.role === 'user' || user.role === 'admin') {
      // ปล่อยให้โหลด DashboardComponent ของ route '' ต่อไปตามปกติ
      return true;
    }

    let target = '/dashboard';
    if (user.role === 'patient') target = '/portal/dashboard';
    else if (user.role === 'guest') target = '/guest-dashboard';

    this.router.navigate([target]);
    return false;
  }
}
