import { Injectable } from '@angular/core';
import { Location } from '@angular/common';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

// หน้าแรกของแต่ละ role — ไม่มีอะไรให้ย้อน (ถ้าไม่ได้มาจากหน้าอื่น) ก็ซ่อนปุ่มย้อนกลับ
const HOME_PATHS = ['/', '/dashboard', '/guest-dashboard', '/portal', '/portal/dashboard'];

// จำหน้าที่เปิดมาในแอปนี้ (เฉพาะใน tab นี้) — ปุ่มย้อนกลับจะพากลับ "หน้าที่กดมาจริง"
// ไม่ได้มาจากหน้าไหน (เปิดลิงก์ตรง / รีเฟรช) → ขึ้นไปหน้าแม่แทน เช่น /patient/12 → /patient
@Injectable({ providedIn: 'root' })
export class NavHistoryService {
  private stack: string[] = [];
  private replacing = false;
  private popstate = false;
  // มีปุ่มย้อนกลับให้กดไหม (หน้าแรกที่ไม่มีประวัติ = ไม่มี)
  readonly canGoBack$ = new BehaviorSubject(false);
  // อยู่หน้าหลักของ role แล้ว — ไม่ต้องโชว์ปุ่มหน้าหลัก
  readonly atHome$ = new BehaviorSubject(true);

  constructor(private router: Router, private location: Location) {
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationStart) {
        this.replacing = !!this.router.getCurrentNavigation()?.extras.replaceUrl;
        this.popstate = e.navigationTrigger === 'popstate';
      }
      if (e instanceof NavigationEnd) this.record(e.urlAfterRedirects);
    });
  }

  private record(url: string) {
    const top = this.stack.length - 1;
    if (this.popstate && this.stack[top - 1] === url) {
      this.stack.pop(); // ปุ่ม back ของเบราว์เซอร์ / ของเรา
    } else if ((this.replacing || this.path(this.stack[top]) === this.path(url)) && top >= 0) {
      this.stack[top] = url; // แค่เปลี่ยน ?tab= / ตัวกรองในหน้าเดิม ไม่นับเป็นหน้าใหม่
    } else {
      this.stack.push(url);
    }
    const atHome = HOME_PATHS.includes(this.path(url));
    this.atHome$.next(atHome);
    this.canGoBack$.next(this.stack.length > 1 || !atHome);
  }

  back(): void {
    if (this.stack.length > 1) {
      this.location.back();
      return;
    }
    // ไม่มีหน้าก่อนหน้าในแอป → ขึ้นไปหน้าแม่ (ตัด segment สุดท้าย)
    const parts = this.path(this.router.url).split('/').filter(Boolean);
    parts.pop();
    this.router.navigateByUrl('/' + parts.join('/'));
  }

  private path(url?: string): string {
    return (url ?? '').split(/[?#]/)[0] || '/';
  }
}
