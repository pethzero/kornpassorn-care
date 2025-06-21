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
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender: 'male' | 'female' | 'other';
  phone?: string;
  email?: string;
  address?: string;
  registeredAt: string;
}
