import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { LoadingSpinnerComponent } from '../../../ui/loading-spinner/loading-spinner';
import { afterMinDuration } from '../../../core/utils/min-duration';

import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-portal-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SelectModule,
    InputTextModule,
    ButtonModule,
    ToastModule,
    LoadingSpinnerComponent,
  ],
  templateUrl: './portal-profile.html',
  styleUrls: ['./portal-profile.scss'],
  providers: [MessageService],
})
export class PortalProfileComponent implements OnInit {
  form: FormGroup;
  loading = false;
  loadingMessage = '';
  patientCode = '';
  phone = '';
  needsProfile = false;

  bloodTypes = [
    { label: 'A', value: 'A' },
    { label: 'B', value: 'B' },
    { label: 'AB', value: 'AB' },
    { label: 'O', value: 'O' },
  ];

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private messageService: MessageService,
  ) {
    this.form = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      gender: [''],
      date_of_birth: [''],
      email: [''],
      address: [''],
      blood_type: [''],
    });
  }

  ngOnInit(): void {
    this.loading = true;
    this.loadingMessage = 'กำลังโหลดข้อมูล...';
    const startedAt = Date.now();

    this.auth.getMyPatientProfile().subscribe({
      next: (patient) => {
        afterMinDuration(startedAt, () => {
          this.loading = false;
          this.patientCode = patient.patient_code;
          this.phone = patient.phone;
          this.needsProfile = patient.first_name === '-';
          this.form.patchValue({
            first_name: patient.first_name === '-' ? '' : patient.first_name,
            last_name: patient.last_name === '-' ? '' : patient.last_name,
            gender: patient.gender,
            date_of_birth: patient.date_of_birth,
            email: patient.email,
            address: patient.address,
            blood_type: patient.blood_type,
          });
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

  save(): void {
    if (this.loading) return;

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'แจ้งเตือน',
        detail: 'กรุณากรอกชื่อและนามสกุลให้ครบถ้วน',
      });
      return;
    }

    this.loading = true;
    this.loadingMessage = 'กำลังบันทึกข้อมูล...';
    const startedAt = Date.now();

    this.auth.updateMyPatientProfile(this.form.value).subscribe({
      next: () => {
        afterMinDuration(startedAt, () => {
          this.loading = false;
          this.needsProfile = false;
          this.messageService.add({
            severity: 'success',
            summary: 'สำเร็จ',
            detail: 'บันทึกข้อมูลเรียบร้อยแล้ว',
          });
        });
      },
      error: (err) => {
        afterMinDuration(startedAt, () => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'ผิดพลาด',
            detail: 'บันทึกข้อมูลไม่สำเร็จ: ' + (err.error?.message || err.message),
          });
        });
      },
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
}
