import { Component, Input } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';

import { EXPIRING_DAYS } from '../../../core/models/storage.model';

// ป้ายเตือนวันหมดอายุบนการ์ดตู้/ช่อง/ห้อง — แดง = มีของหมดอายุแล้ว · ส้ม = ใกล้หมดอายุ · ไม่มีอะไรต้องเตือน = ไม่แสดง
@Component({
  selector: 'app-expiry-badge',
  standalone: true,
  imports: [TooltipModule],
  template: `
    @if (expired) {
      <span class="xb expired" [pTooltip]="'หมดอายุแล้ว ' + expired + ' ล็อต'" tooltipPosition="top">
        <i class="pi pi-exclamation-triangle"></i>{{ expired }}
      </span>
    }
    @if (expiring) {
      <span class="xb expiring" [pTooltip]="'ใกล้หมดอายุ (≤ ' + days + ' วัน) ' + expiring + ' ล็อต'" tooltipPosition="top">
        <i class="pi pi-clock"></i>{{ expiring }}
      </span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      gap: 0.25rem;
      flex-shrink: 0;
    }
    :host:empty {
      display: none;
    }
    .xb {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      padding: 0.1rem 0.4rem;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 700;
      line-height: 1.3;
      white-space: nowrap;
    }
    .xb i {
      font-size: 0.7rem;
    }
    .expired {
      background: #fee2e2;
      color: #b91c1c;
      box-shadow: inset 0 0 0 1px #fecaca;
    }
    .expiring {
      background: #fef3c7;
      color: #b45309;
      box-shadow: inset 0 0 0 1px #fde68a;
    }
  `,
})
export class ExpiryBadgeComponent {
  @Input() expired = 0;
  @Input() expiring = 0;
  readonly days = EXPIRING_DAYS;
}
