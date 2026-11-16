import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavHistoryService } from '../../core/services/nav-history.service';

// ปุ่มย้อนกลับ + หน้าหลัก หน้าหัวข้อการ์ด
//   ← กลับไปหน้าที่กดมาจริง (เปิดลิงก์ตรง = ขึ้นหน้าแม่) · 🏠 ไปหน้าหลักของ role ('/' เลือกปลายทางให้เอง)
//   หน้าหลักเองไม่แสดงทั้งคู่ (ยกเว้นมีหน้าให้ย้อน)
//   ใช้: <div class="header-title-group"><app-back-button /> <h2>...</h2></div>
@Component({
  selector: 'app-back-button',
  standalone: true,
  imports: [AsyncPipe, RouterLink],
  template: `
    @if (nav.canGoBack$ | async) {
      <span class="nav-btns">
        <button type="button" class="nav-btn back" (click)="nav.back()" aria-label="ย้อนกลับ" title="ย้อนกลับ">
          <i class="pi pi-arrow-left"></i>
        </button>
        @if ((nav.atHome$ | async) === false) {
          <a routerLink="/" class="nav-btn" aria-label="หน้าหลัก" title="หน้าหลัก">
            <i class="pi pi-home"></i>
          </a>
        }
      </span>
    }
  `,
  styles: `
    :host {
      display: contents;
    }

    .nav-btns {
      display: inline-flex;
      flex-shrink: 0;
      gap: 0.375rem;
    }

    .nav-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 2.25rem;
      height: 2.25rem;
      border: 1px solid #dfe9e7;
      border-radius: 50%;
      background: #f4f9f8;
      color: #0f766e;
      text-decoration: none;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s, transform 0.15s;

      i {
        font-size: 0.85rem;
      }

      &:hover {
        background: #e3f3f0;
        border-color: #b5ddd7;
      }

      &.back:hover {
        transform: translateX(-2px);
      }

      &:focus-visible {
        outline: 2px solid #99d5cf;
        outline-offset: 2px;
      }
    }
  `,
})
export class BackButtonComponent {
  readonly nav = inject(NavHistoryService);
}
