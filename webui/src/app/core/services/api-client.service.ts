// src/app/core/services/api-client.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiClient, ApiClientPayload, ApiClientWithSecret, ApiScopeInfo } from '../models/api-client.model';

type Res<T> = { success: boolean; message?: string; data: T };

// จัดการระบบภายนอก (admin) — ตัว API ที่ระบบภายนอกเรียกอยู่ที่ /api/v1/* (เอกสาร: /developers)
@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private apiUrl = `${environment.apiUrl}/api-clients`;

  constructor(private http: HttpClient) {}

  scopes(): Observable<Res<ApiScopeInfo[]>> {
    return this.http.get<Res<ApiScopeInfo[]>>(`${this.apiUrl}/scopes`);
  }

  list(): Observable<Res<ApiClient[]>> {
    return this.http.get<Res<ApiClient[]>>(this.apiUrl);
  }

  create(payload: ApiClientPayload): Observable<Res<ApiClientWithSecret>> {
    return this.http.post<Res<ApiClientWithSecret>>(this.apiUrl, payload);
  }

  update(id: number, payload: Partial<ApiClientPayload> & { is_active?: boolean }): Observable<Res<ApiClient>> {
    return this.http.patch<Res<ApiClient>>(`${this.apiUrl}/${id}`, payload);
  }

  rotateSecret(id: number): Observable<Res<ApiClientWithSecret>> {
    return this.http.post<Res<ApiClientWithSecret>>(`${this.apiUrl}/${id}/rotate-secret`, {});
  }

  remove(id: number): Observable<Res<unknown>> {
    return this.http.delete<Res<unknown>>(`${this.apiUrl}/${id}`);
  }
}
