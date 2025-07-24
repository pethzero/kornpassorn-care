// src/app/models/users/user.model.ts

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'doctor' | 'nurse' | 'receptionist';
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Patient {
  id?: number;
  patient_code: string;
  first_name: string;
  last_name: string;
  gender?: string;
  date_of_birth?: string;
  phone?: string;
  email?: string;
  address?: string;
  blood_type?: string;
}
