import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavHistoryService } from './core/services/nav-history.service';
import { RateLimitNoticeComponent } from './ui/rate-limit-notice/rate-limit-notice';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RateLimitNoticeComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {
  protected title = 'webui';
  // เริ่มจำประวัติหน้าตั้งแต่เปิดเว็บ (ปุ่มย้อนกลับบนหัวเว็บใช้)
  private readonly navHistory = inject(NavHistoryService);
}
