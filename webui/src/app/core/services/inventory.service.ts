// src/app/core/services/inventory.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  InventoryProduct,
  InventoryProductLot,
  InventoryProductQueryParams,
  InventoryLotQueryParams,
  InventoryListResponse,
  InventoryItemResponse,
  LotMovementsResult,
} from '../models/inventory.model';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private apiUrl = `${environment.apiUrl}/inventory`;

  constructor(private http: HttpClient) {}

  private toHttpParams(query: object): HttpParams {
    let params = new HttpParams();
    Object.keys(query).forEach((key) => {
      const value = (query as Record<string, unknown>)[key];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return params;
  }

  getProducts(query: InventoryProductQueryParams = {}): Observable<InventoryListResponse<InventoryProduct>> {
    return this.http.get<InventoryListResponse<InventoryProduct>>(`${this.apiUrl}/products`, {
      params: this.toHttpParams(query),
    });
  }

  getProduct(id: number): Observable<InventoryItemResponse<InventoryProduct>> {
    return this.http.get<InventoryItemResponse<InventoryProduct>>(`${this.apiUrl}/products/${id}`);
  }

  createProduct(product: InventoryProduct): Observable<InventoryItemResponse<InventoryProduct>> {
    return this.http.post<InventoryItemResponse<InventoryProduct>>(`${this.apiUrl}/products`, product);
  }

  updateProduct(id: number, product: Partial<InventoryProduct>): Observable<InventoryItemResponse<InventoryProduct>> {
    return this.http.patch<InventoryItemResponse<InventoryProduct>>(`${this.apiUrl}/products/${id}`, product);
  }

  // ลบได้เฉพาะสินค้าที่ยังไม่มีล็อต/เอกสาร (backend ตรวจ) — ที่ใช้แล้วให้ปิดใช้งานแทน
  deleteProduct(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/products/${id}`);
  }

  getLots(query: InventoryLotQueryParams = {}): Observable<InventoryListResponse<InventoryProductLot>> {
    return this.http.get<InventoryListResponse<InventoryProductLot>>(`${this.apiUrl}/lots`, {
      params: this.toHttpParams(query),
    });
  }

  createLot(lot: InventoryProductLot): Observable<InventoryItemResponse<InventoryProductLot>> {
    return this.http.post<InventoryItemResponse<InventoryProductLot>>(`${this.apiUrl}/lots`, lot);
  }

  getLotMovements(id: number): Observable<{ success: boolean; data: LotMovementsResult }> {
    return this.http.get<{ success: boolean; data: LotMovementsResult }>(`${this.apiUrl}/lots/${id}/movements`);
  }

  updateLot(id: number, lot: Partial<InventoryProductLot>): Observable<InventoryItemResponse<InventoryProductLot>> {
    return this.http.patch<InventoryItemResponse<InventoryProductLot>>(`${this.apiUrl}/lots/${id}`, lot);
  }
}
