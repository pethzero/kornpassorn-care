import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

import { PatientService } from '../../../core/services/patient.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { DocumentService } from '../../../core/services/document.service';
import { Patient } from '../../../models/users/user.model';
import { Appointment, APPOINTMENT_STATUS_INFO } from '../../../core/models/appointment.model';
import { ClinicDocument } from '../../../core/models/document.model';
import { formatPhone, formatThaiId, maskThaiId, patientAge, patientGender, patientInitials, patientName } from '../patient-utils';

// ข้อมูลคนไข้รายคน: ข้อมูลติดต่อ + นัดหมาย + ประวัติบริการ (เอกสารบริการคนไข้)
@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonModule, ToastModule, TooltipModule],
  templateUrl: './patient-detail.html',
  styleUrls: ['../../../ui/styles/list-page.scss', './patient-detail.scss'],
  providers: [MessageService],
})
export class PatientDetailComponent implements OnInit {
  readonly name = patientName;
  readonly initials = patientInitials;
  readonly gender = patientGender;
  readonly age = patientAge;
  readonly phone = formatPhone;
  readonly thaiId = formatThaiId;
  readonly maskedId = maskThaiId;
  // เลขบัตรซ่อนกลางไว้ก่อน (ข้อมูลส่วนบุคคล) กดเพื่อดูเต็ม
  showId = false;
  readonly statusInfo = APPOINTMENT_STATUS_INFO;

  patient: Patient | null = null;
  notFound = false;
  upcoming: Appointment[] = [];
  pastAppointments: Appointment[] = [];
  showAllPast = false;
  services: ClinicDocument[] = [];
  servicesTotal = 0;
  loadingHistory = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private patients: PatientService,
    private appointments: AppointmentService,
    private documents: DocumentService,
    private messages: MessageService,
  ) {}

  ngOnInit(): void {
    // มาจากฟอร์มหลังบันทึก
    const state = history.state as { toast?: { severity: string; summary: string; detail: string } } | undefined;
    if (state?.toast) {
      queueMicrotask(() => this.messages.add(state.toast!));
      history.replaceState({ ...history.state, toast: undefined }, '');
    }

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.notFound = true;
      return;
    }
    this.patients.getPatientById(String(id)).subscribe({
      next: (p) => (this.patient = p),
      error: (err) => {
        if (err?.status === 404) this.notFound = true;
        else this.toastError(err);
      },
    });

    this.appointments.list({ patient_id: id }).subscribe({
      next: (res) => {
        const today = this.ymd(new Date());
        this.upcoming = res.data.filter((a) => a.status === 'scheduled' && a.appointment_date >= today);
        // ผ่านมาแล้ว/ปิดแล้ว — ล่าสุดก่อน
        this.pastAppointments = res.data.filter((a) => !this.upcoming.includes(a)).reverse();
      },
      error: (err) => this.toastError(err),
    });

    this.documents.getDocuments({ patient_id: id, doc_type: 'patient_service', limit: 100 }).subscribe({
      next: (res) => {
        this.services = res.data;
        this.servicesTotal = res.data.filter((d) => d.status !== 'void').reduce((s, d) => s + Number(d.total_amount || 0), 0);
        this.loadingHistory = false;
      },
      error: (err) => {
        this.loadingHistory = false;
        this.toastError(err);
      },
    });
  }

  get visitCount(): number {
    return this.services.filter((d) => d.status !== 'void').length;
  }

  get lastVisit(): string | null {
    return this.services.find((d) => d.status !== 'void')?.doc_date ?? null;
  }

  get pastShown(): Appointment[] {
    return this.showAllPast ? this.pastAppointments : this.pastAppointments.slice(0, 5);
  }

  edit(): void {
    this.router.navigate(['/patient/form'], { queryParams: { id: this.patient?.id } });
  }

  newAppointment(): void {
    this.router.navigate(['/appointments'], { queryParams: { new: 1, patient_id: this.patient?.id } });
  }

  newService(): void {
    this.router.navigate(['/documents/new'], { queryParams: { type: 'patient_service', patient_id: this.patient?.id } });
  }

  // ----- แสดงผล -----

  formatDate(d?: string | null, withWeekday = false): string {
    if (!d) return '—';
    return new Intl.DateTimeFormat('th-TH', {
      ...(withWeekday ? { weekday: 'short' as const } : {}),
      day: 'numeric',
      month: 'short',
      year: '2-digit',
    }).format(this.parse(d));
  }

  dayTag(date: string): string | null {
    const diff = Math.round((this.parse(date).getTime() - this.parse(this.ymd(new Date())).getTime()) / 86400000);
    if (diff === 0) return 'วันนี้';
    if (diff === 1) return 'พรุ่งนี้';
    if (diff > 1 && diff <= 7) return `อีก ${diff} วัน`;
    return null;
  }

  time(a: Appointment): string {
    return a.end_time ? `${a.start_time.slice(0, 5)}–${a.end_time.slice(0, 5)}` : a.start_time.slice(0, 5);
  }

  money(n: number): string {
    return Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  private toastError(err: any): void {
    const msg = err?.error?.message;
    this.messages.add({ severity: 'error', summary: 'ผิดพลาด', detail: Array.isArray(msg) ? msg.join(', ') : msg || err.message });
  }

  // วันที่แบบ YYYY-MM-DD → Date เวลาท้องถิ่น (new Date('2026-10-17') จะเป็น UTC แล้วเลื่อนวันได้)
  private parse(d: string): Date {
    const [y, m, day] = d.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, day);
  }

  private ymd(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
