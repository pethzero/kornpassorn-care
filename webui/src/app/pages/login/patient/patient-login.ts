import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-patient-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-login.html',
  styleUrls: ['./patient-login.scss']
})
export class PatientLoginComponent implements OnDestroy {
  step: 'phone' | 'otp' = 'phone';
  phone = '';
  otp = '';
  errorMessage = '';
  isSubmitting = false;
  devOtp = '';

  resendCooldown = 0;
  private cooldownTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private auth: AuthService, private router: Router) {}

  requestOtp(): void {
    if (this.isSubmitting || this.resendCooldown > 0) return;
    this.errorMessage = '';
    this.isSubmitting = true;

    this.auth.requestPatientOtp(this.phone).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.step = 'otp';
        this.devOtp = res.devOtp || '';
        // คนละค่ากับ res.expires_in (อายุของ OTP เอง 5 นาที) — cooldown นี้คือเวลารอก่อนขอรหัสใหม่ได้ (ตรงกับฝั่ง backend)
        this.startCooldown(60);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.message || 'ไม่สามารถขอรหัส OTP ได้ กรุณาลองใหม่อีกครั้ง';
      }
    });
  }

  verifyOtp(): void {
    if (this.isSubmitting) return;
    this.errorMessage = '';
    this.isSubmitting = true;

    this.auth.verifyPatientOtp(this.phone, this.otp).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        if (res.patient?.needsProfile) {
          this.router.navigate(['/portal/profile']);
        } else {
          this.router.navigate(['/portal/dashboard']);
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.message || 'ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง';
      }
    });
  }

  changePhone(): void {
    this.step = 'phone';
    this.otp = '';
    this.errorMessage = '';
    this.stopCooldown();
  }

  private startCooldown(seconds: number): void {
    this.stopCooldown();
    this.resendCooldown = seconds;
    this.cooldownTimer = setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0) {
        this.stopCooldown();
      }
    }, 1000);
  }

  private stopCooldown(): void {
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
      this.cooldownTimer = null;
    }
    this.resendCooldown = 0;
  }

  ngOnDestroy(): void {
    this.stopCooldown();
  }
}
