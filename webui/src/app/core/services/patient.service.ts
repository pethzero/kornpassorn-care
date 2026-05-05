// src/app/core/services/patient.service.ts

import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Patient } from '../../models/users/user.model'; // 👈 เปลี่ยน import
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PatientService {
  constructor(private http: HttpClient) { }

  getSummaryPatient(): Observable<{ success: boolean; message: string; data: Patient }> {
    let params = new HttpParams();
    // if (startDate) params = params.set('start_date', startDate);
    // if (endDate) params = params.set('end_date', endDate);

    return this.http.get<{ success: boolean; message: string; data: Patient }>(`${environment.apiUrl}/summary`, { params });
  }


  createPatient(patient: Patient): Observable<Patient> {
    return this.http.post<Patient>(`${environment.apiUrl}/patients`, patient);
  }

  updatePatient(id: number, patient: Partial<Patient>): Observable<any> {
    return this.http.put(`${environment.apiUrl}/patients/${id}`, patient);
  }

  getPatientById(id: string): Observable<Patient> {
    return this.http.get<Patient>(`${environment.apiUrl}/patients/${id}`);
  }


}
