import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { FormsModule } from '@angular/forms';


@Component({
  standalone: true,
  selector: 'app-admin-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-login.html',
  styleUrls: ['./admin-login.scss']
})
export class AdminLoginComponent {
  username = '';
  password = '';
  errorMessage = '';
  isSubmitting = false;

  constructor(private auth: AuthService, private router: Router) { }

  login(): void {
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    this.auth.loginWithCredentials(this.username, this.password).subscribe(success => {
      this.isSubmitting = false;
      if (success) {
        this.router.navigate(['/dashboard']);
      } else {
        this.errorMessage = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
      }
    });
  }
}
