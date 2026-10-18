import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  FinanceRecord,
  FinanceSummary,
  FinanceQueryParams,
  MonthlyFinance,
  PaginatedResponse,
  TrendPoint
} from '../models/finance.model';

@Injectable({
  providedIn: 'root'
})
export class FinanceService {
  private apiUrl = `${environment.apiUrl}/finance`;

  constructor(private http: HttpClient) { }

  getSummary(startDate?: string, endDate?: string): Observable<{ success: boolean; message: string; data: FinanceSummary }> {
    let params = new HttpParams();
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);

    return this.http.get<{ success: boolean; message: string; data: FinanceSummary }>(`${this.apiUrl}/summary`, { params });
  }

  getFinanceRecords(queryParams: FinanceQueryParams = {}): Observable<PaginatedResponse<FinanceRecord>> {
    let params = new HttpParams();
    Object.keys(queryParams).forEach(key => {
      const value = (queryParams as any)[key];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });
    // token แนบให้โดย auth interceptor อยู่แล้ว (เดิมแนบเองซ้ำ + console.log token ออกมา — เอาออกเพราะทำให้ token รั่วใน console)
    return this.http.get<PaginatedResponse<FinanceRecord>>(this.apiUrl, { params });
  }


  getFinanceRecord(id: number): Observable<{ success: boolean; message: string; data: FinanceRecord }> {
    return this.http.get<{ success: boolean; message: string; data: FinanceRecord }>(`${this.apiUrl}/${id}`);
  }

  createFinanceRecord(record: Omit<FinanceRecord, 'id'>): Observable<{ success: boolean; message: string; data: FinanceRecord }> {
    return this.http.post<{ success: boolean; message: string; data: FinanceRecord }>(this.apiUrl, record);
  }

  updateFinanceRecord(id: number, record: Partial<FinanceRecord>): Observable<{ success: boolean; message: string; data: FinanceRecord }> {
    return this.http.patch<{ success: boolean; message: string; data: FinanceRecord }>(`${this.apiUrl}/${id}`, record);
  }

  deleteFinanceRecord(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`);
  }

  getTrend(startDate: string, endDate: string, granularity: 'day' | 'month'): Observable<{ success: boolean; data: TrendPoint[] }> {
    const params = new HttpParams().set('start_date', startDate).set('end_date', endDate).set('granularity', granularity);
    return this.http.get<{ success: boolean; data: TrendPoint[] }>(`${this.apiUrl}/reports/trend`, { params });
  }

  getMonthlyReport(months = 6): Observable<{ success: boolean; data: MonthlyFinance[] }> {
    const params = new HttpParams().set('months', String(months));
    return this.http.get<{ success: boolean; data: MonthlyFinance[] }>(`${this.apiUrl}/reports/monthly`, { params });
  }

  getDailyReport(startDate?: string, endDate?: string): Observable<any> {
    let params = new HttpParams();
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);

    return this.http.get(`${this.apiUrl}/reports/daily`, { params });
  }
}
