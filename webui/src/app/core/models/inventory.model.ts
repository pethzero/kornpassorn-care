// src/app/core/models/inventory.model.ts
export type InventoryProductCategory = 'medicine' | 'supply' | 'other';

export interface InventoryProduct {
  id?: number;
  sku?: string;
  name: string;
  category: InventoryProductCategory;
  // หน่วยที่ตัดสต็อก/จ่ายจริง เช่น "เม็ด"
  unit?: string;
  // หน่วยที่ซื้อเข้า ถ้าต่างจาก unit เช่น "กล่อง" — ต้องมาคู่กับ pack_size
  pack_unit?: string;
  // จำนวน unit ต่อ 1 pack_unit เช่น 1 กล่อง = 30 เม็ด
  pack_size?: number;
  description?: string;
  is_active?: boolean;
  create_date?: string;
}

export interface InventoryProductLot {
  id?: number;
  product_id: number;
  product?: InventoryProduct;
  lot_no: string;
  manufacture_date?: string;
  expiry_date?: string;
  // ส่งอย่างใดอย่างหนึ่ง: quantity_in (หน่วย unit) หรือ received_pack_qty (หน่วย pack_unit) ตอนสร้าง
  quantity_in?: number;
  received_pack_qty?: number;
  quantity_remaining?: number;
  unit_cost?: number;
  pack_unit_cost?: number;
  supplier?: string;
  // เจ้าของยี่ห้อ/ผู้ผลิต (ต่างจาก supplier ซึ่งเป็นร้าน/คนที่ซื้อมาด้วย)
  brand?: string;
  received_date?: string;
  note?: string;
  modify_by?: string;
  modify_date?: string;
  // true = มีรายการการเงินอ้างอิง lot นี้แล้ว แก้ไขไม่ได้อีก (คำนวณฝั่ง backend)
  is_locked?: boolean;
}

export interface InventoryProductQueryParams {
  search?: string;
  category?: InventoryProductCategory;
  is_active?: boolean;
  page?: number;
  limit?: number;
}

export interface InventoryLotQueryParams {
  product_id?: number;
  expiring_before?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface InventoryListResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginatedMeta;
}

export interface InventoryItemResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}
