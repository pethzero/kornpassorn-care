import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { PatientService } from '../../../core/services/patient.service';
import { Patient } from '../../../models/users/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { LoadingSpinnerComponent } from '../../../ui/loading-spinner/loading-spinner';
import { afterMinDuration } from '../../../core/utils/min-duration';
import { formatThaiId, isValidThaiId, onlyDigits, patientAge } from '../patient-utils';

@Component({
  selector: 'app-patient-form',
  standalone: true,
  templateUrl: './patient-form.html',
  styleUrls: ['../../../ui/styles/list-page.scss', './patient-form.scss'],
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, ToastModule, LoadingSpinnerComponent],
  providers: [MessageService]
})
export class PatientFormComponent implements OnInit {
  patientForm: FormGroup;
  isEditMode = false;
  patientId: number | null = null;
  loading = false;
  loadingMessage = '';
  readonly today = new Date().toISOString().slice(0, 10);

  readonly genders = [
    { value: 'female', label: 'หญิง' },
    { value: 'male', label: 'ชาย' },
    { value: 'other', label: 'อื่นๆ' },
  ];
  readonly bloodTypes = ['A', 'B', 'AB', 'O'];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private patientService: PatientService,
    private auth: AuthService,
    private messageService: MessageService
  ) {
    this.patientForm = this.fb.group({
      patient_code: ['', [Validators.required, Validators.maxLength(20)]],
      // ไม่บังคับ — ถ้ากรอกต้องครบ 13 หลักและหลักสุดท้ายถูกต้อง (กันพิมพ์ผิด)
      national_id: ['', thaiIdValidator],
      first_name: ['', [Validators.required, Validators.maxLength(100)]],
      last_name: ['', [Validators.required, Validators.maxLength(100)]],
      gender: [''],
      date_of_birth: [''],
      phone: ['', [Validators.required, Validators.pattern(/^(?:\+66|0)\d{8,9}$/)]],
      // ไม่บังคับ — คนไข้ส่วนใหญ่ไม่มี/ไม่ให้อีเมล
      email: ['', [Validators.email, Validators.maxLength(100)]],
      address: [''],
      blood_type: [''],
    });
  }

  ngOnInit(): void {
    // POST/PUT /patients ต้องมี CSRF token
    this.auth.fetchCsrfToken().subscribe({ error: () => this.toast('warn', 'เตรียมฟอร์มไม่สำเร็จ', 'รีเฟรชหน้าแล้วลองใหม่') });

    const id = Number(this.route.snapshot.queryParamMap.get('id'));
    if (id) {
      this.isEditMode = true;
      this.patientId = id;
      this.loadPatient(id);
    } else {
      this.suggestCode();
    }
  }

  get age(): number | null {
    return patientAge(this.patientForm.value.date_of_birth);
  }

  suggestCode(): void {
    this.patientService.nextCode().subscribe({
      next: ({ code }) => {
        const ctrl = this.patientForm.get('patient_code')!;
        if (!ctrl.value) ctrl.setValue(code);
      },
    });
  }

  // พิมพ์เลขบัตร → ใส่ขีดให้อ่านง่าย 1-2345-67890-12-3 (เก็บจริงเฉพาะตัวเลข)
  onNationalIdInput(): void {
    const ctrl = this.patientForm.get('national_id')!;
    const d = onlyDigits(ctrl.value).slice(0, 13);
    const parts = [d.slice(0, 1), d.slice(1, 5), d.slice(5, 10), d.slice(10, 12), d.slice(12, 13)].filter(Boolean);
    const formatted = parts.join('-');
    if (formatted !== ctrl.value) ctrl.setValue(formatted, { emitEvent: false });
  }

  pick(field: 'gender' | 'blood_type', value: string): void {
    const ctrl = this.patientForm.get(field)!;
    ctrl.setValue(ctrl.value === value ? '' : value); // กดซ้ำ = ยกเลิกเลือก
    ctrl.markAsDirty();
  }

  private loadPatient(id: number): void {
    this.loading = true;
    this.loadingMessage = 'กำลังโหลดข้อมูลคนไข้...';
    const startedAt = Date.now();
    this.patientService.getPatientById(String(id)).subscribe({
      next: (patient: Patient) => {
        afterMinDuration(startedAt, () => {
          // null จาก DB → '' ให้ช่อง input
          const v: Record<string, unknown> = {};
          for (const key of Object.keys(this.patientForm.controls)) v[key] = (patient as any)[key] ?? '';
          if (v['national_id']) v['national_id'] = formatThaiId(v['national_id'] as string);
          this.patientForm.reset(v);
          this.loading = false;
        });
      },
      error: (err) => {
        afterMinDuration(startedAt, () => {
          this.loading = false;
          this.toast('error', 'โหลดข้อมูลไม่สำเร็จ', err.error?.message || err.message);
        });
      }
    });
  }

  submit(): void {
    if (this.loading) return;

    this.patientForm.markAllAsTouched();
    if (this.patientForm.invalid) {
      this.toast('warn', 'ข้อมูลยังไม่ครบ', 'ตรวจช่องที่มีกรอบแดง');
      return;
    }

    this.loading = true;
    this.loadingMessage = 'กำลังบันทึกข้อมูล...';
    const startedAt = Date.now();
    const data: Patient = { ...this.patientForm.value, national_id: onlyDigits(this.patientForm.value.national_id) };

    const request$ = this.isEditMode && this.patientId
      ? this.patientService.updatePatient(this.patientId, data)
      : this.patientService.createPatient(data);

    request$.subscribe({
      next: (res: any) => {
        afterMinDuration(startedAt, () => {
          this.loading = false;
          const id = this.patientId ?? res?.id;
          // บันทึกแล้วไปหน้าข้อมูลคนไข้ — ทำนัด/บันทึกบริการต่อได้เลย
          this.router.navigate(id ? ['/patient', id] : ['/patient/list'], {
            state: { toast: { severity: 'success', summary: 'สำเร็จ', detail: this.isEditMode ? 'บันทึกการแก้ไขแล้ว' : 'เพิ่มคนไข้แล้ว' } },
          });
        });
      },
      error: (err) => {
        afterMinDuration(startedAt, () => {
          this.loading = false;
          const msg = err.error?.message;
          this.toast('error', 'บันทึกไม่สำเร็จ', Array.isArray(msg) ? msg.join(', ') : msg || err.message);
        });
      }
    });
  }

  onCancel(): void {
    this.router.navigate(this.patientId ? ['/patient', this.patientId] : ['/patient/list']);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.patientForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const errors = this.patientForm.get(fieldName)?.errors;
    if (!errors) return '';
    if (errors['required']) return 'กรุณากรอกข้อมูลนี้';
    if (errors['thaiIdLength']) return `ต้องมี 13 หลัก (ตอนนี้ ${errors['thaiIdLength'].actual} หลัก)`;
    if (errors['thaiIdChecksum']) return 'เลขบัตรไม่ถูกต้อง — ตรวจทานอีกครั้ง';
    if (errors['pattern']) return fieldName === 'phone' ? 'เบอร์โทร 9–10 หลัก ขึ้นต้นด้วย 0 เช่น 0812345678' : 'รูปแบบไม่ถูกต้อง';
    if (errors['email']) return 'รูปแบบอีเมลไม่ถูกต้อง';
    if (errors['maxlength']) return `ยาวเกิน ${errors['maxlength'].requiredLength} ตัวอักษร`;
    return '';
  }

  private toast(severity: string, summary: string, detail: string): void {
    this.messageService.add({ severity, summary, detail, life: 5000 });
  }
}

function thaiIdValidator(control: AbstractControl): ValidationErrors | null {
  const d = onlyDigits(control.value);
  if (!d) return null;
  if (d.length !== 13) return { thaiIdLength: { actual: d.length } };
  return isValidThaiId(d) ? null : { thaiIdChecksum: true };
}
