import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
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
  rememberMe = false;
  errorMessage = '';
  isSubmitting = false;
  // มาจากการถูกเตะออก/เซสชันหมดอายุ (auth interceptor ส่ง ?signedOut=1 มา)
  readonly signedOut = inject(ActivatedRoute).snapshot.queryParamMap.has('signedOut');

  constructor(private auth: AuthService, private router: Router) {}

  login(): void {
    // กันกดซ้ำ/ดับเบิลคลิกตอน request ยังไม่เสร็จ ไม่งั้นยิง /auth/login ซ้ำ
    // จนได้ token 2 ชุด (access+refresh x2) ใน user_tokens จากการ login ครั้งเดียว
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    this.auth.loginWithCredentials(this.username, this.password, this.rememberMe).subscribe(success => {
      this.isSubmitting = false;
      if (success) {
        this.router.navigate(['/dashboard']);
      } else {
        this.errorMessage = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
      }
    });
  }

  loginAsGuest(): void {
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    this.auth.loginAsGuest().subscribe(success => {
      this.isSubmitting = false;
      if (success) {
        this.router.navigate(['/guest-dashboard']);
      } else {
        this.errorMessage = 'ไม่สามารถเข้าสู่ระบบ guest ได้';
      }
    });
  }
}
