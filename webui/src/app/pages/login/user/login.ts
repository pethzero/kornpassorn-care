import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent {
  username = '';
  password = '';
  errorMessage = '';

  constructor(private auth: AuthService, private router: Router) {}

  login(): void {
    this.auth.loginWithCredentials(this.username, this.password).subscribe(success => {
      if (success) {
        this.router.navigate(['/dashboard']);
      } else {
        this.errorMessage = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
      }
    });
  }

  loginAsGuest(): void {
    console.log('เรียก loginAsGuest');
    this.auth.loginAsGuest().subscribe(success => {
      if (success) {
        this.router.navigate(['/dashboard']);
      } else {
        this.errorMessage = 'ไม่สามารถเข้าสู่ระบบ guest ได้';
      }
    });
  }
}
