import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  HospitalScheduleResponse,
  HospitalSpecialDay,
  HospitalWeeklyHours,
} from '../models/hospital-schedule.model';

@Injectable({ providedIn: 'root' })
export class HospitalScheduleService {
  private apiUrl = `${environment.apiUrl}/hospital-schedule`;

  constructor(private http: HttpClient) {}

  getPublicSchedule(): Observable<HospitalScheduleResponse> {
    return this.http.get<HospitalScheduleResponse>(this.apiUrl);
  }

  saveWeekly(days: HospitalWeeklyHours[]): Observable<HospitalWeeklyHours[]> {
    return this.http.put<HospitalWeeklyHours[]>(`${this.apiUrl}/weekly`, { days });
  }

  addSpecialDay(day: HospitalSpecialDay): Observable<HospitalSpecialDay> {
    return this.http.post<HospitalSpecialDay>(`${this.apiUrl}/special-days`, day);
  }

  removeSpecialDay(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/special-days/${id}`);
  }
}
