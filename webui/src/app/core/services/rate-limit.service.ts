import { Injectable, signal } from '@angular/core';

// backend ตอบ 429 (ส่งคำขอถี่เกิน) → แถบแจ้งเตือนบนสุดของเว็บ นับถอยหลังจนใช้ได้อีกครั้ง (ดู ui/rate-limit-notice)
@Injectable({ providedIn: 'root' })
export class RateLimitService {
  // เวลา (ms) ที่ใช้ได้อีกครั้ง — 0 = ไม่ได้โดนจำกัด
  readonly blockedUntil = signal(0);

  hit(retryAfterSeconds?: number): void {
    const until = Date.now() + Math.max(1, retryAfterSeconds || 30) * 1000;
    if (until > this.blockedUntil()) this.blockedUntil.set(until);
  }
}
