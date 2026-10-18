// src/app/core/services/document.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CreateDocumentPayload,
  DocumentListResponse,
  DocumentQueryParams,
  DocumentResponse,
  DocumentSummaryResponse,
} from '../models/document.model';

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private apiUrl = `${environment.apiUrl}/documents`;

  constructor(private http: HttpClient) {}

  getDocuments(query: DocumentQueryParams = {}): Observable<DocumentListResponse> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    });
    return this.http.get<DocumentListResponse>(this.apiUrl, { params });
  }

  getSummary(): Observable<DocumentSummaryResponse> {
    return this.http.get<DocumentSummaryResponse>(`${this.apiUrl}/summary`);
  }

  getDocument(id: number): Observable<DocumentResponse> {
    return this.http.get<DocumentResponse>(`${this.apiUrl}/${id}`);
  }

  createDocument(payload: CreateDocumentPayload): Observable<DocumentResponse> {
    return this.http.post<DocumentResponse>(this.apiUrl, payload);
  }

  voidDocument(id: number, reason?: string): Observable<DocumentResponse> {
    return this.http.patch<DocumentResponse>(`${this.apiUrl}/${id}/void`, { reason });
  }
}
