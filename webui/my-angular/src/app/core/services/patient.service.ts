// src/app/core/services/patient.service.ts

import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Patient } from '../../models/users/user.model'; // 👈 เปลี่ยน import
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PatientService {
    constructor(private http: HttpClient) {}
    
  createPatient(patient: Patient): Observable<Patient> {
    return this.http.post<Patient>(`${environment.apiUrl}/patients`, patient);
  }

  updatePatient(id: number, patient: Partial<Patient>): Observable<any> {
    return this.http.put(`${environment.apiUrl}/patients/${id}`, patient);
  }
}
