import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { AuthService, User } from '../../../core/services/auth.service';

const ROLE_LABELS: Record<string, string> = {
  admin: 'ผู้ดูแลระบบ',
  user: 'เจ้าหน้าที่',
  patient: 'คนไข้',
  guest: 'ผู้เยี่ยมชม',
};

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [CommonModule, MatMenuModule, MatIconModule, MatButtonModule],
  templateUrl: './user-menu.html',
  styleUrls: ['./user-menu.scss']
})
export class UserMenu implements OnInit {
  user: User | null = null;
  private destroyRef = inject(DestroyRef);

  constructor(private auth: AuthService, private router: Router) { }

  ngOnInit(): void {
    // ชื่อเปลี่ยนทันทีหลังแก้โปรไฟล์ในหน้าตั้งค่า (patchCurrentUser)
    this.auth.currentUser$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(u => this.user = u);
  }

  get isStaff(): boolean {
    return this.user?.role === 'admin' || this.user?.role === 'user';
  }

  get displayName(): string {
    return this.user?.name || this.user?.username || ROLE_LABELS[this.user?.role ?? ''] || 'ผู้ใช้';
  }

  get roleLabel(): string {
    return ROLE_LABELS[this.user?.role ?? ''] ?? this.user?.role ?? '';
  }

  // อักษรแรกของชื่อ + นามสกุล (ไทย: ตัวแรกของแต่ละคำ ข้ามสระนำ เ แ โ ใ ไ)
  get initials(): string {
    const words = this.displayName.trim().split(/\s+/).filter(Boolean);
    const first = (w: string) => (w.match(/[^เ-ไ]/)?.[0] ?? w[0] ?? '').toUpperCase();
    return words.slice(0, 2).map(first).join('') || '?';
  }

  go(path: string, tab?: string) {
    this.router.navigate([path], tab ? { queryParams: { tab } } : {});
  }

  logout() {
    // ต้องจำ role ไว้ก่อน เพราะ auth.logout() จะเคลียร์ currentUser เป็น null ก่อน callback ทำงาน
    const role = this.user?.role;
    this.auth.logout(() => {
      this.router.navigate([role === 'admin' ? '/admin-login' : role === 'patient' ? '/patient-login' : '/login']);
    });
  }
}
