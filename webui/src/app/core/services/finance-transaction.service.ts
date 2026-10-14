// src/app/core/services/finance-transaction.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CreateFinanceTransactionPayload,
  FinanceTransactionItemResponse,
  FinanceTransactionListResponse,
  FinanceTransactionQueryParams,
  FinanceTransactionSummaryResponse,
} from '../models/finance-transaction.model';

@Injectable({ providedIn: 'root' })
export class FinanceTransactionService {
  private apiUrl = `${environment.apiUrl}/finance-transactions`;

  constructor(private http: HttpClient) {}

  getTransactions(query: FinanceTransactionQueryParams = {}): Observable<FinanceTransactionListResponse> {
    let params = new HttpParams();
    Object.keys(query).forEach((key) => {
      const value = (query as Record<string, unknown>)[key];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<FinanceTransactionListResponse>(this.apiUrl, { params });
  }

  getSummary(): Observable<FinanceTransactionSummaryResponse> {
    return this.http.get<FinanceTransactionSummaryResponse>(`${this.apiUrl}/summary`);
  }

  getTransaction(id: number): Observable<FinanceTransactionItemResponse> {
    return this.http.get<FinanceTransactionItemResponse>(`${this.apiUrl}/${id}`);
  }

  createTransaction(payload: CreateFinanceTransactionPayload): Observable<FinanceTransactionItemResponse> {
    return this.http.post<FinanceTransactionItemResponse>(this.apiUrl, payload);
  }

  voidTransaction(id: number): Observable<FinanceTransactionItemResponse> {
    return this.http.patch<FinanceTransactionItemResponse>(`${this.apiUrl}/${id}/void`, {});
  }
}
