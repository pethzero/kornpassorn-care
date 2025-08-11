import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface FinanceRecord {
  id?: number;
  category: 'income' | 'expense';
  amount: number;
  item_name: string;
  description?: string;
  record_date: string;
  created_at?: string;
  updated_at?: string;
}

export interface FinanceSummary {
  income: {
    count: number;
    total: number;
    average: number;
  };
  expense: {
    count: number;
    total: number;
    average: number;
  };
  net_income: number;
  date_range: {
    start_date: string | null;
    end_date: string | null;
  };
}

export interface FinanceQueryParams {
  category?: 'income' | 'expense';
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class FinanceService {
  private apiUrl = `${environment.apiUrl}/finance`;

  constructor(private http: HttpClient) {}

  // ดึงข้อมูลสรุปการเงิน
  getSummary(startDate?: string, endDate?: string): Observable<{ success: boolean; message: string; data: FinanceSummary }> {
    let params = new HttpParams();
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);
    
    return this.http.get<{ success: boolean; message: string; data: FinanceSummary }>(`${this.apiUrl}/summary`, { params });
  }

  // ดึงรายการการเงินทั้งหมด
  getFinanceRecords(queryParams: FinanceQueryParams = {}): Observable<PaginatedResponse<FinanceRecord>> {
    let params = new HttpParams();
    
    Object.keys(queryParams).forEach(key => {
      const value = (queryParams as any)[key];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<PaginatedResponse<FinanceRecord>>(this.apiUrl, { params });
  }

  // ดึงรายการการเงินตาม ID
  getFinanceRecord(id: number): Observable<{ success: boolean; message: string; data: FinanceRecord }> {
    return this.http.get<{ success: boolean; message: string; data: FinanceRecord }>(`${this.apiUrl}/${id}`);
  }

  // สร้างรายการการเงินใหม่
  createFinanceRecord(record: Omit<FinanceRecord, 'id'>): Observable<{ success: boolean; message: string; data: FinanceRecord }> {
    return this.http.post<{ success: boolean; message: string; data: FinanceRecord }>(this.apiUrl, record);
  }

  // อัปเดตรายการการเงิน
  updateFinanceRecord(id: number, record: Partial<FinanceRecord>): Observable<{ success: boolean; message: string; data: FinanceRecord }> {
    return this.http.patch<{ success: boolean; message: string; data: FinanceRecord }>(`${this.apiUrl}/${id}`, record);
  }

  // ลบรายการการเงิน
  deleteFinanceRecord(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`);
  }

  // ดึงรายงานรายวัน
  getDailyReport(startDate?: string, endDate?: string): Observable<any> {
    let params = new HttpParams();
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);
    
    return this.http.get(`${this.apiUrl}/reports/daily`, { params });
  }
}
