import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HospitalScheduleService } from '../../core/services/hospital-schedule.service';
import { HospitalSpecialDay, HospitalWeeklyHours } from '../../core/models/hospital-schedule.model';

const DAY_LABELS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

@Component({
  selector: 'app-hospital-hours',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hospital-hours.html',
  styleUrls: ['./hospital-hours.scss'],
})
export class HospitalHoursComponent implements OnInit {
  dayLabels = DAY_LABELS;
  weekly: HospitalWeeklyHours[] = [];
  specialDays: HospitalSpecialDay[] = [];
  loading = true;
  todayDayOfWeek = new Date().getDay();

  constructor(private hospitalScheduleService: HospitalScheduleService) {}

  ngOnInit(): void {
    this.hospitalScheduleService.getPublicSchedule().subscribe({
      next: (res) => {
        this.weekly = res.weekly;
        this.specialDays = res.specialDays;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  formatTime(time?: string | null): string {
    return time ? time.slice(0, 5) : '';
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(date));
  }
}
