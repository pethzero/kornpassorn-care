import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { RateLimitService } from '../../core/services/rate-limit.service';

// แถบแจ้ง "ส่งคำขอถี่เกินไป" — วางครั้งเดียวที่ app.html ใช้ได้ทุกหน้า (รวมหน้า login)
@Component({
  selector: 'app-rate-limit-notice',
  standalone: true,
  template: `
    @if (secondsLeft() > 0) {
      <div class="notice" role="alert">
        <i class="pi pi-hourglass"></i>
        <span>ส่งคำขอถี่เกินไป กรุณารอ <strong>{{ secondsLeft() }}</strong> วินาทีแล้วลองใหม่</span>
      </div>
    }
  `,
  styles: `
    .notice {
      position: fixed;
      top: 0.75rem;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2000;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      max-width: calc(100vw - 2rem);
      padding: 0.6rem 1rem;
      border: 1px solid #f5d38a;
      border-radius: 999px;
      background: #fff8e6;
      color: #8a5a00;
      font-size: 0.9rem;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
    }
  `,
})
export class RateLimitNoticeComponent {
  private readonly rateLimit = inject(RateLimitService);
  private readonly now = signal(Date.now());
  readonly secondsLeft = computed(() => Math.max(0, Math.ceil((this.rateLimit.blockedUntil() - this.now()) / 1000)));

  constructor() {
    // เดินนาฬิกาเฉพาะตอนโดนจำกัดอยู่
    let timer: ReturnType<typeof setInterval> | null = null;
    effect(() => {
      if (this.rateLimit.blockedUntil() > Date.now() && !timer) {
        this.now.set(Date.now());
        timer = setInterval(() => {
          this.now.set(Date.now());
          if (this.secondsLeft() === 0 && timer) {
            clearInterval(timer);
            timer = null;
          }
        }, 1000);
      }
    });
    inject(DestroyRef).onDestroy(() => timer && clearInterval(timer));
  }
}
