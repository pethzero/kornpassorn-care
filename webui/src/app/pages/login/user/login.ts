import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule,FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']  // แก้ชื่อเป็น styleUrls (พหูพจน์)
})
export class LoginComponent {
  username = '';
  password = '';
  errorMessage = '';

  constructor(private auth: AuthService, private router: Router) {}

  login() {
    const success = this.auth.loginWithCredentials(this.username, this.password);
    if (success) {
      this.router.navigate(['/dashboard']);
    } else {
      this.errorMessage = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
    }
  }

  loginAsGuest() {
    const success = this.auth.loginAsGuest();
    if (success) {
      this.router.navigate(['/dashboard']);
    } else {
      this.errorMessage = 'ไม่สามารถเข้าสู่ระบบ guest ได้';
    }
  }
}
