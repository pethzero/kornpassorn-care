import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';

import { AppointmentService } from '../../core/services/appointment.service';
import { PatientService } from '../../core/services/patient.service';
import { SettingsService } from '../../core/services/settings.service';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Appointment,
  APPOINTMENT_STATUS_INFO,
  AppointmentPayload,
  AppointmentStatus,
} from '../../core/models/appointment.model';

type Range = 'today' | 'week' | 'month' | 'custom';

interface DayGroup {
  date: string;
  items: Appointment[];
}

// นัดหมายคนไข้ (ภายใน) — ระบบภายนอกอ่านได้ทาง /api/v1/appointments
@Component({
  selector: 'app-appointment-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, SelectModule, ToastModule, TooltipModule, ConfirmDialogModule],
  templateUrl: './appointment-list.html',
  styleUrls: ['../../ui/styles/list-page.scss', './appointment-list.scss'],
  providers: [MessageService, ConfirmationService],
})
export class AppointmentListComponent implements OnInit {
  readonly statusInfo = APPOINTMENT_STATUS_INFO;
  readonly statusOptions = [
    { label: 'ทุกสถานะ', value: '' },
    ...(Object.keys(APPOINTMENT_STATUS_INFO) as AppointmentStatus[]).map((s) => ({ label: APPOINTMENT_STATUS_INFO[s].label, value: s })),
  ];
  // รายการบริการตั้งค่าได้ที่ ตั้งค่า → คลินิก & บริการ (dropdown พิมพ์ชื่ออื่นเองได้)
  serviceOptions: { label: string; value: string }[] = [];

  range: Range = 'week';
  dateFrom = '';
  dateTo = '';
  status: AppointmentStatus | '' = '';
  search = '';
  loading = false;
  groups: DayGroup[] = [];
  total = 0;

  patientOptions: { label: string; value: number }[] = [];

  // dialog เพิ่ม/แก้
  showDialog = false;
  saving = false;
  editingId: number | null = null;
  form: AppointmentPayload = this.emptyForm();

  constructor(
    private api: AppointmentService,
    private patients: PatientService,
    private messages: MessageService,
    private confirm: ConfirmationService,
    private settings: SettingsService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.setRange('week');
    this.patients.getPatients().subscribe({
      next: (list: any[]) =>
        (this.patientOptions = list.map((p) => ({ label: `${p.first_name} ${p.last_name ?? ''} (${p.patient_code})`.replace(/\s+/g, ' '), value: p.id }))),
    });
    this.settings.activeServices().subscribe({
      next: (services) => (this.serviceOptions = services.map((s) => ({ label: s.name, value: s.name }))),
    });

    // มาจากหน้าคนไข้ (?new=1&patient_id=) → เปิดฟอร์มนัดใหม่ เลือกคนไข้ไว้ให้
    const q = this.route.snapshot.queryParamMap;
    if (q.get('new')) {
      this.openCreate();
      const pid = Number(q.get('patient_id'));
      if (pid) this.form.patient_id = pid;
      this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    }
  }

  // ----- ช่วงวันที่ -----

  setRange(range: Range): void {
    this.range = range;
    const today = new Date();
    if (range === 'today') [this.dateFrom, this.dateTo] = [this.ymd(today), this.ymd(today)];
    if (range === 'week') [this.dateFrom, this.dateTo] = [this.ymd(today), this.ymd(this.addDays(today, 6))];
    if (range === 'month') [this.dateFrom, this.dateTo] = [this.ymd(new Date(today.getFullYear(), today.getMonth(), 1)), this.ymd(new Date(today.getFullYear(), today.getMonth() + 1, 0))];
    if (range !== 'custom') this.load();
  }

  load(): void {
    this.loading = true;
    this.api.list({ date_from: this.dateFrom, date_to: this.dateTo, status: this.status || undefined, search: this.search || undefined }).subscribe({
      next: (res) => {
        const map = new Map<string, Appointment[]>();
        for (const a of res.data) map.set(a.appointment_date, [...(map.get(a.appointment_date) || []), a]);
        this.groups = [...map.entries()].map(([date, items]) => ({ date, items }));
        this.total = res.data.length;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toastError(err);
      },
    });
  }

  // ----- เพิ่ม / แก้ -----

  openCreate(): void {
    this.editingId = null;
    this.form = this.emptyForm();
    this.showDialog = true;
  }

  openEdit(a: Appointment): void {
    this.editingId = a.id;
    this.form = {
      patient_id: a.patient_id,
      appointment_date: a.appointment_date,
      start_time: a.start_time.slice(0, 5),
      end_time: a.end_time ? a.end_time.slice(0, 5) : '',
      service: a.service,
      status: a.status,
      note: a.note || '',
    };
    this.showDialog = true;
  }

  save(): void {
    const f = this.form;
    if (!f.patient_id || !f.appointment_date || !f.start_time || !f.service?.trim()) {
      this.messages.add({ severity: 'warn', summary: 'กรอกไม่ครบ', detail: 'เลือกคนไข้ วันที่ เวลาเริ่ม และบริการ' });
      return;
    }
    const payload: AppointmentPayload = { ...f, service: f.service.trim(), end_time: f.end_time || null, note: f.note || null };
    this.saving = true;
    const req$ = this.editingId ? this.api.update(this.editingId, payload) : this.api.create(payload);
    req$.subscribe({
      next: (res) => {
        this.saving = false;
        this.showDialog = false;
        this.messages.add({ severity: 'success', summary: 'สำเร็จ', detail: res.message });
        this.load();
      },
      error: (err) => {
        this.saving = false;
        this.toastError(err);
      },
    });
  }

  // ----- สถานะ / ลบ -----

  setStatus(a: Appointment, status: AppointmentStatus): void {
    this.api.update(a.id, { status }).subscribe({
      next: () => {
        a.status = status;
        this.messages.add({ severity: 'success', summary: APPOINTMENT_STATUS_INFO[status].label, detail: `${this.patientName(a)} · ${a.service}` });
      },
      error: (err) => this.toastError(err),
    });
  }

  confirmDelete(a: Appointment): void {
    this.confirm.confirm({
      header: 'ลบนัดหมาย',
      message: `ลบนัด ${a.service} ของ ${this.patientName(a)} วันที่ ${this.dayLabel(a.appointment_date)} ${a.start_time.slice(0, 5)} ใช่หรือไม่? (ถ้าแค่ไม่มาตามนัด ให้เปลี่ยนสถานะแทน)`,
      icon: 'pi pi-trash',
      rejectButtonProps: { label: 'ไม่ลบ', severity: 'secondary', outlined: true },
      acceptButtonProps: { label: 'ลบ', severity: 'danger' },
      accept: () =>
        this.api.remove(a.id).subscribe({
          next: () => {
            this.messages.add({ severity: 'success', summary: 'ลบแล้ว', detail: a.service });
            this.load();
          },
          error: (err) => this.toastError(err),
        }),
    });
  }

  // ----- แสดงผล -----

  patientName(a: Appointment): string {
    return a.patient ? `${a.patient.first_name} ${a.patient.last_name ?? ''}`.trim() : `คนไข้ #${a.patient_id}`;
  }

  timeLabel(a: Appointment): string {
    return a.end_time ? `${a.start_time.slice(0, 5)}–${a.end_time.slice(0, 5)}` : a.start_time.slice(0, 5);
  }

  dayLabel(date: string): string {
    return new Intl.DateTimeFormat('th-TH', { weekday: 'long', day: 'numeric', month: 'long' }).format(this.parse(date));
  }

  dayTag(date: string): string | null {
    const diff = Math.round((this.parse(date).getTime() - this.parse(this.ymd(new Date())).getTime()) / 86400000);
    return diff === 0 ? 'วันนี้' : diff === 1 ? 'พรุ่งนี้' : diff < 0 ? 'ผ่านมาแล้ว' : null;
  }

  private emptyForm(): AppointmentPayload {
    return { patient_id: 0, appointment_date: this.ymd(new Date()), start_time: '09:00', end_time: '', service: '', note: '' };
  }

  private toastError(err: any): void {
    const msg = err?.error?.message;
    this.messages.add({ severity: 'error', summary: 'ผิดพลาด', detail: Array.isArray(msg) ? msg.join(', ') : msg || err.message });
  }

  private parse(date: string): Date {
    const [y, m, d] = date.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  private addDays(d: Date, n: number): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  }

  private ymd(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
