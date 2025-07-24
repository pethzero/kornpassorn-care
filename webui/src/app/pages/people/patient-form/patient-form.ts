import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PatientService } from '../../../core/services/patient.service';
import { Patient } from '../../../models/users/user.model';

@Component({
  selector: 'app-patient-form',
  standalone: true,
  templateUrl: './patient-form.html',
  styleUrls: ['./patient-form.scss'],
  imports: [CommonModule, ReactiveFormsModule]
})
export class PatientFormComponent {
  patientForm: FormGroup;
  successMessage = '';
  errorMessage = '';

  constructor(private fb: FormBuilder, private patientService: PatientService) {
    this.patientForm = this.fb.group({
      patient_code: ['', Validators.required],
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      gender: [''],
      date_of_birth: [''],
      phone: [''],
      email: [''],
      address: [''],
      blood_type: ['']
    });
  }

  submit() {
    if (this.patientForm.invalid) return;
    const data: Patient = this.patientForm.value;
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