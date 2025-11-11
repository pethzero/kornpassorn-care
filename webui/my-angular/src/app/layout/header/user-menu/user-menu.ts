import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../../../core/services/auth.service';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    MatMenuModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule
  ],
  templateUrl: './user-menu.html',
  styleUrls: ['./user-menu.scss']
})
export class UserMenu implements OnInit {
  user: User | null = null;

  constructor(private auth: AuthService, private router: Router) { }

  ngOnInit(): void {
    this.user = this.auth.getCurrentUser();
    console.log('Current user:', this.user);

    // subscribe ถ้าอยาก update user live
    this.auth.currentUser$.subscribe(u => this.user = u);
  }

  logout() {
    // ใช้ callback หลัง logout เสร็จ
    this.auth.logout(() => {
      console.log('logout system', this.user);

      // อัปเดต user หลัง logout
      this.user = this.auth.getCurrentUser();

      if (this.user?.role === 'admin') {
        this.router.navigate(['/admin-login']);
      } else {
        this.router.navigate(['/login']);
      }
    });
  }

  goToSettings() {
    this.router.navigate(['/settings']);
  }
}
