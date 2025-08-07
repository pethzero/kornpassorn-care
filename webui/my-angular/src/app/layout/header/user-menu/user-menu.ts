import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { FormsModule } from '@angular/forms';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-user-menu',
  imports: [FormsModule, CommonModule, MatMenuModule, MatIconModule, MatButtonModule, MatDividerModule],
  templateUrl: './user-menu.html',
  styleUrl: './user-menu.scss'
})
export class UserMenu implements OnInit {
  user: any;

  constructor(private auth: AuthService, private router: Router) { }

  ngOnInit(): void {
    this.user = this.auth.getCurrentUser();
    console.log(this.user)
  }

  logout() {
    this.auth.logout();
    console.log('logout system', this.user)
    if (this.user.role === 'admin') {
      this.router.navigate(['/admin-login']);
    } else {
      this.router.navigate(['/login']);
    }
    // this.router.navigate(['/login']);
  }

  goToSettings() {
    this.router.navigate(['/settings']);
  }
}
