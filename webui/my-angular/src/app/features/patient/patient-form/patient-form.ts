import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PatientService } from '../../../core/services/patient.service';
import { Patient } from '../../../models/users/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-patient-form',
  standalone: true,
  templateUrl: './patient-form.html',
  styleUrls: ['./patient-form.scss'],
  imports: [CommonModule, ReactiveFormsModule, SelectModule]
})
export class PatientFormComponent implements OnInit {
  patientForm!: FormGroup;
  successMessage = '';
  errorMessage = '';

  bloodTypes = [
    { label: 'A', value: 'A' },
    { label: 'B', value: 'B' },
    { label: 'AB', value: 'AB' },
    { label: 'O', value: 'O' },
  ];

  constructor(
    private fb: FormBuilder,
    private patientService: PatientService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.patientForm = this.fb.group({
      patient_code: ['', Validators.required],
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      gender: [''],
      date_of_birth: [''],
      phone: [
        '',
        [
          Validators.required,
          Validators.pattern(/^(?:\+66|0)\d{8,9}$/) // ✅ ตรวจ format เบอร์ไทย
        ]
      ],
      email: ['', [Validators.required, Validators.email]], // ✅ ตรวจ email
      address: [''],
      blood_type: ['']
    });

    this.auth.fetchCsrfToken().subscribe();
  }

  submit() {
    if (this.patientForm.invalid) return;

    const data: Patient = this.patientForm.value;
    console.log(data);
    this.patientService.createPatient(data).subscribe({
      next: () => {
        this.successMessage = 'เพิ่มคนไข้สำเร็จ!';
        this.errorMessage = '';
        this.patientForm.reset();
      },
      error: (err) => {
        this.errorMessage = 'เกิดข้อผิดพลาด: ' + (err.error?.message || err.message);
        this.successMessage = '';
      }
    });
  }
}
