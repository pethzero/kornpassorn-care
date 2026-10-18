// src/app/core/services/settings.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, map } from 'rxjs';
import { environment } from '../../environments/environment';

type Res<T> = { success: boolean; message?: string; data: T };

export interface ClinicInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  tax_id?: string;
  line_id?: string;
}

export interface ServiceItem {
  name: string;
  // ราคาตั้งต้น — เติมให้ในเอกสารบริการคนไข้ (null = ไม่ตั้ง)
  price: number | null;
  active: boolean;
}

export interface ClinicSettings {
  clinic: ClinicInfo;
  services: ServiceItem[];
  updated_at?: string | null;
  updated_by?: string | null;
}

export interface StaffUser {
  id: string;
  username: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt?: string;
}

// 1 session = 1 การ login (refresh token) — current = เครื่องที่ใช้อยู่
export interface Session {
  id: string;
  created_at: string;
  last_used?: string | null;
  expired_at?: string | null;
  current: boolean;
  deviceInfo?: { ua?: { browser?: { name?: string }; os?: { name?: string; version?: string }; device?: { type?: string } }; ip?: string } | null;
  deviceIp?: string | null;
}

// การตั้งค่าคลินิก + บัญชีของฉัน + จัดการผู้ใช้ (admin)
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private api = environment.apiUrl;
  // รายการบริการใช้หลายหน้า — cache ไว้ (โหลดใหม่หลังบันทึก)
  private clinic$?: Observable<ClinicSettings>;

  constructor(private http: HttpClient) {}

  // ----- คลินิก -----
  getClinic(force = false): Observable<ClinicSettings> {
    if (!this.clinic$ || force) {
      this.clinic$ = this.http.get<Res<ClinicSettings>>(`${this.api}/settings/clinic`).pipe(map((r) => r.data), shareReplay(1));
    }
    return this.clinic$;
  }

  // บริการที่เปิดใช้ — สำหรับ dropdown ในเอกสาร/นัดหมาย
  activeServices(): Observable<ServiceItem[]> {
    return this.getClinic().pipe(map((s) => s.services.filter((x) => x.active)));
  }

  saveClinic(data: ClinicSettings): Observable<Res<ClinicSettings>> {
    this.clinic$ = undefined;
    return this.http.put<Res<ClinicSettings>>(`${this.api}/settings/clinic`, { clinic: data.clinic, services: data.services });
  }

  // ----- บัญชีของฉัน -----
  getAccount(): Observable<Res<StaffUser>> {
    return this.http.get<Res<StaffUser>>(`${this.api}/account`);
  }

  updateAccount(data: Partial<StaffUser>): Observable<Res<StaffUser>> {
    return this.http.patch<Res<StaffUser>>(`${this.api}/account`, data);
  }

  changePassword(current_password: string, new_password: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.api}/account/password`, { current_password, new_password });
  }

  sessions(): Observable<Res<Session[]>> {
    return this.http.get<Res<Session[]>>(`${this.api}/account/sessions`);
  }

  revokeSession(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.api}/account/sessions/${id}`);
  }

  // ----- ผู้ใช้ (admin) -----
  listUsers(): Observable<Res<StaffUser[]>> {
    return this.http.get<Res<StaffUser[]>>(`${this.api}/users`);
  }

  createUser(data: Partial<StaffUser> & { password: string }): Observable<Res<StaffUser>> {
    return this.http.post<Res<StaffUser>>(`${this.api}/users`, data);
  }

  updateUser(id: string, data: Partial<StaffUser>): Observable<Res<StaffUser>> {
    return this.http.patch<Res<StaffUser>>(`${this.api}/users/${id}`, data);
  }

  resetPassword(id: string, new_password: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.api}/users/${id}/reset-password`, { new_password });
  }
}
