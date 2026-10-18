import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Patient } from '../../../models/users/user.model';
import { PatientService } from '../../../core/services/patient.service';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { LoadingSpinnerComponent } from '../../../ui/loading-spinner/loading-spinner';
import { afterMinDuration } from '../../../core/utils/min-duration';
import { patientAge, patientGender, patientInitials, patientName } from '../patient-utils';

type GenderFilter = '' | 'male' | 'female';

@Component({
  selector: 'app-patient-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    ToastModule,
    TooltipModule,
    ConfirmDialogModule,
    LoadingSpinnerComponent,
  ],
  templateUrl: './patient-list.html',
  styleUrls: ['../../../ui/styles/list-page.scss', './patient-list.scss'],
  providers: [MessageService, ConfirmationService],
})
export class PatientList implements OnInit {
  readonly name = patientName;
  readonly initials = patientInitials;
  readonly gender = patientGender;
  readonly age = patientAge;

  patients: Patient[] = [];
  filtered: Patient[] = [];
  loading = false;
  deleting = false;
  searchTerm = '';
  genderFilter: GenderFilter = '';

  readonly genderTabs: { value: GenderFilter; label: string }[] = [
    { value: '', label: 'ทั้งหมด' },
    { value: 'female', label: 'หญิง' },
    { value: 'male', label: 'ชาย' },
  ];

  constructor(
    private router: Router,
    private patientService: PatientService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.loadPatients();

    const state = history.state as { toast?: { severity: string; summary: string; detail: string } } | undefined;
    if (state?.toast) {
      this.messageService.add(state.toast);
      history.replaceState({ ...history.state, toast: undefined }, '');
    }
  }

  loadPatients(): void {
    this.loading = true;
    const startedAt = Date.now();
    this.patientService.getPatients().subscribe({
      next: (data) => {
        afterMinDuration(startedAt, () => {
          // ลงทะเบียนล่าสุดขึ้นก่อน
          this.patients = [...data].sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
          this.applyFilter();
          this.loading = false;
        });
      },
      error: (err) => {
        afterMinDuration(startedAt, () => {
          this.loading = false;
          this.toastError('โหลดรายชื่อคนไข้ไม่สำเร็จ', err);
        });
      },
    });
  }

  // ค้นหา ชื่อ / นามสกุล / รหัส / เบอร์โทร / เลขบัตร (ตัวเลขค้นได้ทั้งมีและไม่มีขีด)
  applyFilter(): void {
    const q = this.searchTerm.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    this.filtered = this.patients.filter((p) => {
      if (this.genderFilter && this.gender(p.gender).key !== this.genderFilter) return false;
      if (!q) return true;
      const text = `${p.first_name} ${p.last_name} ${p.patient_code} ${p.email ?? ''}`.toLowerCase();
      const phone = (p.phone ?? '').replace(/\D/g, '');
      const nationalId = (p.national_id ?? '').replace(/\D/g, '');
      return text.includes(q) || (digits.length >= 3 && (phone.includes(digits) || nationalId.includes(digits)));
    });
  }

  setGender(g: GenderFilter): void {
    this.genderFilter = g;
    this.applyFilter();
  }

  countGender(g: GenderFilter): number {
    return g ? this.patients.filter((p) => this.gender(p.gender).key === g).length : this.patients.length;
  }

  formatDate(date?: string): string {
    if (!date) return '—';
    return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }).format(new Date(date));
  }

  navigateToAdd(): void {
    this.router.navigate(['/patient/form']);
  }

  open(patient: Patient): void {
    this.router.navigate(['/patient', patient.id]);
  }

  editPatient(patient: Patient): void {
    this.router.navigate(['/patient/form'], { queryParams: { id: patient.id } });
  }

  confirmDelete(patient: Patient): void {
    if (this.deleting) return;
    this.confirmationService.confirm({
      header: 'ลบคนไข้',
      message: `ลบ "${this.name(patient)}" (${patient.patient_code}) ใช่หรือไม่? นัดหมายของคนไข้จะถูกลบด้วย — ถ้ามีเอกสารบริการแล้วจะลบไม่ได้`,
      icon: 'pi pi-exclamation-triangle',
      rejectButtonProps: { label: 'ยกเลิก', severity: 'secondary', outlined: true },
      acceptButtonProps: { label: 'ลบ', severity: 'danger' },
      accept: () => this.deletePatient(patient),
    });
  }

  private deletePatient(patient: Patient): void {
    if (!patient.id) return;
    this.deleting = true;
    const startedAt = Date.now();
    this.patientService.deletePatient(patient.id).subscribe({
      next: () => {
        afterMinDuration(startedAt, () => {
          this.deleting = false;
          this.messageService.add({ severity: 'success', summary: 'ลบแล้ว', detail: this.name(patient) });
          this.loadPatients();
        });
      },
      error: (err) => {
        afterMinDuration(startedAt, () => {
          this.deleting = false;
          this.toastError('ลบไม่สำเร็จ', err);
        });
      },
    });
  }

  private toastError(summary: string, err: any): void {
    const msg = err?.error?.message;
    this.messageService.add({ severity: 'error', summary, detail: Array.isArray(msg) ? msg.join(', ') : msg || err.message, life: 6000 });
  }
}
