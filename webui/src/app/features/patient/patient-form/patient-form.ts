import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { PatientService } from '../../../core/services/patient.service';
import { Patient } from '../../../models/users/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { SelectModule } from 'primeng/select';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { LoadingSpinnerComponent } from '../../../ui/loading-spinner/loading-spinner';
import { afterMinDuration } from '../../../core/utils/min-duration';

@Component({
  selector: 'app-patient-form',
  standalone: true,
  templateUrl: './patient-form.html',
  styleUrls: ['./patient-form.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SelectModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    ToastModule,
    LoadingSpinnerComponent
  ],
  providers: [MessageService]
})
export class PatientFormComponent implements OnInit {
  patientForm: FormGroup;
  isEditMode = false;
  patientId: any | null = null;
  loading = false;
  loadingMessage = '';

  bloodTypes = [
    { label: 'A', value: 'A' },
    { label: 'B', value: 'B' },
    { label: 'AB', value: 'AB' },
    { label: 'O', value: 'O' },
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private patientService: PatientService,
    private auth: AuthService,
    private messageService: MessageService
  ) {
    this.patientForm = this.fb.group({
      patient_code: ['', Validators.required],
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      gender: [''],
      date_of_birth: [''],
      phone: ['', [Validators.required, Validators.pattern(/^(?:\+66|0)\d{8,9}$/)]],
      email: ['', [Validators.required, Validators.email]],
      address: [''],
      blood_type: ['']
    });
  }

  ngOnInit(): void {
    this.auth.fetchCsrfToken().subscribe({
      next: (res) => console.log('✅ CSRF token:', res.csrfToken),
      error: (err) => console.error('❌ CSRF error:', err)
    });

    this.patientId = this.route.snapshot.queryParamMap.get('id');
    if (this.patientId) {
      this.isEditMode = true;
      this.loadPatient(this.patientId);
    }
  }

  private loadPatient(id: string): void {
    this.loading = true;
    this.loadingMessage = 'กำลังโหลดข้อมูลผู้ป่วย...';
    const startedAt = Date.now();
    this.patientService.getPatientById(id).subscribe({
      next: (patient: Patient) => {
        afterMinDuration(startedAt, () => {
          this.patientForm.patchValue(patient);
          this.loading = false;
        });
      },
      error: (err) => {
        afterMinDuration(startedAt, () => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'ผิดพลาด',
            detail: 'โหลดข้อมูลไม่สำเร็จ: ' + (err.error?.message || err.message)
          });
        });
      }
    });
  }

  submit(): void {
    if (this.loading) return;

    this.patientForm.markAllAsTouched();
    if (this.patientForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'แจ้งเตือน',
        detail: 'กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง'
      });
      return;
    }

    this.loading = true;
    this.loadingMessage = 'กำลังบันทึกข้อมูล...';
    const startedAt = Date.now();
    const data: Patient = this.patientForm.value;

    const request$ = this.isEditMode && this.patientId
      ? this.patientService.updatePatient(this.patientId, data)
      : this.patientService.createPatient(data);

    request$.subscribe({
      next: () => {
        afterMinDuration(startedAt, () => {
          this.loading = false;
          this.router.navigate(['/patient/list'], {
            state: {
              toast: {
                severity: 'success',
                summary: 'สำเร็จ',
                detail: this.isEditMode ? 'แก้ไขข้อมูลสำเร็จ!' : 'เพิ่มคนไข้สำเร็จ!'
              }
            }
          });
        });
      },
      error: (err) => {
        afterMinDuration(startedAt, () => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'เกิดข้อผิดพลาด',
            detail: 'เกิดข้อผิดพลาด: ' + (err.error?.message || err.message)
          });
        });
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/patient/list']);
  }

  onReset(): void {
    this.patientForm.reset();
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.patientForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.patientForm.get(fieldName);
    if (field && field.errors && (field.dirty || field.touched)) {
      if (field.errors['required']) return 'กรุณากรอกข้อมูลนี้';
      if (field.errors['pattern']) return 'รูปแบบไม่ถูกต้อง';
      if (field.errors['email']) return 'รูปแบบอีเมลไม่ถูกต้อง';
    }
    return '';
  }
}