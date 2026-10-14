import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HospitalScheduleService } from '../../../core/services/hospital-schedule.service';
import { HospitalSpecialDay, HospitalWeeklyHours } from '../../../core/models/hospital-schedule.model';
import { LoadingSpinnerComponent } from '../../../ui/loading-spinner/loading-spinner';
import { afterMinDuration } from '../../../core/utils/min-duration';

import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

const DAY_LABELS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

@Component({
  selector: 'app-hospital-schedule-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, ToastModule, ConfirmDialogModule, LoadingSpinnerComponent],
  templateUrl: './hospital-schedule-admin.html',
  styleUrls: ['./hospital-schedule-admin.scss'],
  providers: [MessageService, ConfirmationService],
})
export class HospitalScheduleAdminComponent implements OnInit {
  dayLabels = DAY_LABELS;
  weekly: HospitalWeeklyHours[] = [];
  specialDays: HospitalSpecialDay[] = [];

  newSpecialDay: HospitalSpecialDay = { date: '', is_closed: true, note: '' };

  loading = false;
  saving = false;

  constructor(
    private hospitalScheduleService: HospitalScheduleService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    const startedAt = Date.now();

    this.hospitalScheduleService.getPublicSchedule().subscribe({
      next: (res) => {
        afterMinDuration(startedAt, () => {
          this.weekly = DAY_LABELS.map((_, day) =>
            res.weekly.find((w) => w.day_of_week === day) ?? { day_of_week: day, is_closed: true },
          );
          this.specialDays = res.specialDays;
          this.loading = false;
        });
      },
      error: (err) => {
        afterMinDuration(startedAt, () => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'ผิดพลาด',
            detail: 'โหลดข้อมูลไม่สำเร็จ: ' + (err.error?.message || err.message),
          });
        });
      },
    });
  }

  saveWeekly(): void {
    if (this.saving) return;
    this.saving = true;
    const startedAt = Date.now();

    this.hospitalScheduleService.saveWeekly(this.weekly).subscribe({
      next: (data) => {
        afterMinDuration(startedAt, () => {
          this.saving = false;
          this.weekly = data;
          this.messageService.add({ severity: 'success', summary: 'สำเร็จ', detail: 'บันทึกเวลาทำการเรียบร้อยแล้ว' });
        });
      },
      error: (err) => {
        afterMinDuration(startedAt, () => {
          this.saving = false;
          this.messageService.add({
            severity: 'error',
            summary: 'ผิดพลาด',
            detail: 'บันทึกไม่สำเร็จ: ' + (err.error?.message || err.message),
          });
        });
      },
    });
  }

  addSpecialDay(): void {
    if (!this.newSpecialDay.date) {
      this.messageService.add({ severity: 'warn', summary: 'แจ้งเตือน', detail: 'กรุณาเลือกวันที่' });
      return;
    }

    this.hospitalScheduleService.addSpecialDay(this.newSpecialDay).subscribe({
      next: (day) => {
        this.specialDays = [...this.specialDays, day].sort((a, b) => a.date.localeCompare(b.date));
        this.newSpecialDay = { date: '', is_closed: true, note: '' };
        this.messageService.add({ severity: 'success', summary: 'สำเร็จ', detail: 'เพิ่มวันพิเศษเรียบร้อยแล้ว' });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'ผิดพลาด',
          detail: 'เพิ่มไม่สำเร็จ: ' + (err.error?.message || err.message),
        });
      },
    });
  }

  confirmRemoveSpecialDay(event: Event, day: HospitalSpecialDay): void {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: `ลบวันพิเศษ "${day.date}" ใช่หรือไม่?`,
      header: 'ยืนยันการลบ',
      icon: 'pi pi-exclamation-triangle',
      rejectButtonProps: { label: 'ยกเลิก', severity: 'secondary', outlined: true },
      acceptButtonProps: { label: 'ลบ', severity: 'danger' },
      accept: () => this.removeSpecialDay(day),
    });
  }

  private removeSpecialDay(day: HospitalSpecialDay): void {
    if (!day.id) return;
    this.hospitalScheduleService.removeSpecialDay(day.id).subscribe({
      next: () => {
        this.specialDays = this.specialDays.filter((d) => d.id !== day.id);
        this.messageService.add({ severity: 'success', summary: 'สำเร็จ', detail: 'ลบวันพิเศษเรียบร้อยแล้ว' });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'ผิดพลาด',
          detail: 'ลบไม่สำเร็จ: ' + (err.error?.message || err.message),
        });
      },
    });
  }
}
