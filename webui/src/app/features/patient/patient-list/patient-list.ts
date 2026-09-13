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
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { LoadingSpinnerComponent } from '../../../ui/loading-spinner/loading-spinner';
import { afterMinDuration } from '../../../core/utils/min-duration';

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
    TagModule,
    ConfirmDialogModule,
    LoadingSpinnerComponent,
  ],
  templateUrl: './patient-list.html',
  styleUrls: ['./patient-list.scss'],
  providers: [MessageService, ConfirmationService],
})
export class PatientList implements OnInit {
  patients: Patient[] = [];
  loading = false;
  searchTerm = '';
  deleting = false;

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
          this.patients = data;
          this.loading = false;
        });
      },
      error: (err) => {
        afterMinDuration(startedAt, () => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'ผิดพลาด',
            detail: 'โหลดรายชื่อผู้ป่วยไม่สำเร็จ: ' + (err.error?.message || err.message),
          });
        });
      },
    });
  }

  fullName(patient: Patient): string {
    return `${patient.first_name} ${patient.last_name}`.trim();
  }

  initials(patient: Patient): string {
    const a = patient.first_name?.charAt(0) || '';
    const b = patient.last_name?.charAt(0) || '';
    return (a + b).toUpperCase() || '?';
  }

  genderLabel(gender?: string): string {
    if (gender === 'male' || gender === 'M') return 'ชาย';
    if (gender === 'female' || gender === 'F') return 'หญิง';
    return gender || '-';
  }

  genderClass(gender?: string): string {
    if (gender === 'male' || gender === 'M') return 'gender-tag gender-male';
    if (gender === 'female' || gender === 'F') return 'gender-tag gender-female';
    return 'gender-tag gender-other';
  }

  age(dateOfBirth?: string): number | null {
    if (!dateOfBirth) return null;
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) return null;

    const today = new Date();
    let years = today.getFullYear() - dob.getFullYear();
    const hasHadBirthdayThisYear =
      today.getMonth() > dob.getMonth() ||
      (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
    if (!hasHadBirthdayThisYear) years--;
    return years;
  }

  formatDate(date?: string): string {
    if (!date) return '-';
    return new Intl.DateTimeFormat('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(date));
  }

  navigateToAdd(): void {
    this.router.navigate(['/patient/form']);
  }

  editPatient(patient: Patient): void {
    this.router.navigate(['/patient/form'], { queryParams: { id: patient.id } });
  }

  confirmDelete(event: Event, patient: Patient): void {
    if (this.deleting) return;

    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: `คุณต้องการลบข้อมูลผู้ป่วย "${this.fullName(patient)}" ใช่หรือไม่?`,
      header: 'ยืนยันการลบ',
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
          this.messageService.add({
            severity: 'success',
            summary: 'สำเร็จ',
            detail: 'ลบข้อมูลผู้ป่วยเรียบร้อยแล้ว',
          });
          this.loadPatients();
        });
      },
      error: (err) => {
        afterMinDuration(startedAt, () => {
          this.deleting = false;
          this.messageService.add({
            severity: 'error',
            summary: 'ผิดพลาด',
            detail: 'ลบข้อมูลไม่สำเร็จ: ' + (err.error?.message || err.message),
          });
        });
      },
    });
  }
}
