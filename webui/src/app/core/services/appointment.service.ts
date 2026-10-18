// src/app/core/services/appointment.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Appointment, AppointmentPayload, AppointmentQuery } from '../models/appointment.model';

type Res<T> = { success: boolean; message?: string; data: T };

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private apiUrl = `${environment.apiUrl}/appointments`;

  constructor(private http: HttpClient) {}

  list(query: AppointmentQuery = {}): Observable<Res<Appointment[]>> {
    let params = new HttpParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<Res<Appointment[]>>(this.apiUrl, { params });
  }

  create(payload: AppointmentPayload): Observable<Res<Appointment>> {
    return this.http.post<Res<Appointment>>(this.apiUrl, payload);
  }

  update(id: number, payload: Partial<AppointmentPayload>): Observable<Res<Appointment>> {
    return this.http.patch<Res<Appointment>>(`${this.apiUrl}/${id}`, payload);
  }

  remove(id: number): Observable<Res<unknown>> {
    return this.http.delete<Res<unknown>>(`${this.apiUrl}/${id}`);
  }
}
