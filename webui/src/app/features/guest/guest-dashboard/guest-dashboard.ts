import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { HospitalScheduleService } from '../../../core/services/hospital-schedule.service';
import { HospitalSpecialDay, HospitalWeeklyHours } from '../../../core/models/hospital-schedule.model';

const DAY_LABELS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const DAY_HEADERS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

interface CalendarDay {
  date: Date;
  dateKey: string;
  inMonth: boolean;
  isToday: boolean;
  isClosed: boolean;
  isSpecial: boolean;
  tooltip: string;
}

@Component({
  selector: 'app-guest-dashboard',
  standalone: true,
  imports: [CommonModule, TooltipModule],
  templateUrl: './guest-dashboard.html',
  styleUrls: ['./guest-dashboard.scss'],
})
export class GuestDashboardComponent implements OnInit {
  dayLabels = DAY_LABELS;
  dayHeaders = DAY_HEADERS;
  weekly: HospitalWeeklyHours[] = [];
  specialDays: HospitalSpecialDay[] = [];
  loading = true;
  todayDayOfWeek = new Date().getDay();

  viewDate = new Date();
  calendarLabel = '';
  calendarDays: CalendarDay[] = [];

  constructor(private router: Router, private hospitalScheduleService: HospitalScheduleService) {}

  ngOnInit(): void {
    this.buildCalendar();
    this.hospitalScheduleService.getPublicSchedule().subscribe({
      next: (res) => {
        this.weekly = res.weekly;
        this.specialDays = res.specialDays;
        this.loading = false;
        this.buildCalendar();
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  get todayStatus(): { available: boolean; hours: string } {
    const specialToday = this.specialDays.find((d) => this.isToday(d.date));
    const rule = specialToday ?? this.weekly.find((w) => w.day_of_week === this.todayDayOfWeek);

    if (!rule || rule.is_closed) {
      return { available: false, hours: '' };
    }
    return { available: true, hours: `${this.formatTime(rule.open_time)} - ${this.formatTime(rule.close_time)} น.` };
  }

  private isToday(date: string): boolean {
    return new Date(date).toDateString() === new Date().toDateString();
  }

  formatTime(time?: string | null): string {
    return time ? time.slice(0, 5) : '';
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(date));
  }

  goToQuestionnaire(): void {
    this.router.navigate(['/questionnaire-fill']);
  }

  prevMonth(): void {
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() - 1, 1);
    this.buildCalendar();
  }

  nextMonth(): void {
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + 1, 1);
    this.buildCalendar();
  }

  private buildCalendar(): void {
    const year = this.viewDate.getFullYear();
    const month = this.viewDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startDate = new Date(firstOfMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const todayKey = this.toDateKey(new Date());
    const days: CalendarDay[] = [];

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
      const dateKey = this.toDateKey(date);
      const dayOfWeek = date.getDay();
      const special = this.specialDays.find((d) => this.toDateKey(new Date(d.date)) === dateKey);
      const weeklyRule = this.weekly.find((w) => w.day_of_week === dayOfWeek);
      const isClosed = special ? special.is_closed : !!weeklyRule?.is_closed;

      days.push({
        date,
        dateKey,
        inMonth: date.getMonth() === month,
        isToday: dateKey === todayKey,
        isClosed,
        isSpecial: !!special,
        tooltip: this.buildTooltip(special, weeklyRule, isClosed),
      });
    }

    this.calendarDays = days;
    this.calendarLabel = new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(firstOfMonth);
  }

  private buildTooltip(special: HospitalSpecialDay | undefined, weeklyRule: HospitalWeeklyHours | undefined, isClosed: boolean): string {
    if (special) {
      if (special.is_closed) {
        return special.note || 'วันหยุดพิเศษ / หมอไม่อยู่';
      }
      return special.note || `เปิดบริการพิเศษ ${this.formatTime(special.open_time)} - ${this.formatTime(special.close_time)} น.`;
    }
    if (isClosed) {
      return weeklyRule?.note || 'หมอไม่อยู่ (ปิดทำการประจำสัปดาห์)';
    }
    if (weeklyRule) {
      return `เปิดบริการ ${this.formatTime(weeklyRule.open_time)} - ${this.formatTime(weeklyRule.close_time)} น.`;
    }
    return '';
  }

  private toDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}
