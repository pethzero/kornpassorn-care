// src/app/core/services/patient.service.ts

import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Patient } from '../../models/users/user.model'; // 👈 เปลี่ยน import
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class PatientService {
    constructor(private http: HttpClient) {}
    getPatientsMock(): Observable<Patient[]> {
        const mockPatients: Patient[] = [
            {
                id: '1',
                firstName: 'สมชาย',
                lastName: 'ใจดี',
                dob: '1990-01-01',
                gender: 'male',
                phone: '0812345678',
                email: 'somchai@example.com',
                address: '123 ถนนสุขุมวิท',
                registeredAt: '2023-06-01'
            },
            {
                id: '2',
                firstName: 'ศิริพร',
                lastName: 'แสงทอง',
                dob: '1985-05-12',
                gender: 'female',
                registeredAt: '2024-01-20'
            }
        ];

        return of(mockPatients);
    }

    getPatients(): Observable<Patient[]> {
        return this.http.get<Patient[]>('/api/patients');
    }
}
