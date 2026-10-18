// src/app/core/models/document.model.ts
import {
  InventoryProduct,
  InventoryProductLot,
  InventoryProductPackage,
  PaginatedMeta,
} from './inventory.model';

// receive = รับของเข้า (RCV) | issue = เบิก/หักสต็อก (ISS) | patient_service = บริการคนไข้ (SRV) | adjust = ปรับยอด (ADJ)
export type DocumentType = 'receive' | 'issue' | 'patient_service' | 'adjust';
export type DocumentStatus = 'confirmed' | 'void';
export type DocumentItemType = 'product' | 'service' | 'other';

export interface DocumentTypeInfo {
  value: DocumentType;
  label: string;
  short: string;
  icon: string;
  hint: string;
  // ผลต่อบัญชีการเงิน
  ledger: 'expense' | 'income' | null;
}

export const DOCUMENT_TYPE_INFO: DocumentTypeInfo[] = [
  { value: 'receive', label: 'รับของเข้า', short: 'รับเข้า', icon: 'pi pi-download',
    hint: 'ซื้อยา/เวชภัณฑ์เข้าคลัง — ลงบัญชีเป็นรายจ่าย', ledger: 'expense' },
  { value: 'patient_service', label: 'บริการคนไข้', short: 'บริการ', icon: 'pi pi-heart',
    hint: 'ค่าบริการ + ยาที่ใช้กับคนไข้ — ตัดสต็อกและลงบัญชีเป็นรายรับ', ledger: 'income' },
  { value: 'issue', label: 'เบิก / หักสต็อก', short: 'เบิก', icon: 'pi pi-upload',
    hint: 'เบิกใช้ภายในคลินิก — ตัดสต็อกอย่างเดียว ไม่ลงบัญชี', ledger: null },
  { value: 'adjust', label: 'ปรับยอดสต็อก', short: 'ปรับยอด', icon: 'pi pi-sliders-h',
    hint: 'ของหมดอายุ ชำรุด หรือนับสต็อกไม่ตรง — ไม่ลงบัญชี', ledger: null },
];

export function documentTypeInfo(type: DocumentType | string): DocumentTypeInfo {
  return DOCUMENT_TYPE_INFO.find((t) => t.value === type) ?? DOCUMENT_TYPE_INFO[0];
}

export interface DocumentPatient {
  id: number;
  patient_code: string;
  first_name: string;
  last_name: string;
}

export interface DocumentItem {
  id?: number;
  line_no?: number;
  item_type?: DocumentItemType;
  direction?: 'in' | 'out' | null;
  category?: string | null;
  product_id?: number | null;
  product?: InventoryProduct | null;
  product_lot_id?: number | null;
  product_lot?: InventoryProductLot | null;
  package_id?: number | null;
  package?: InventoryProductPackage | null;
  pack_qty?: number | null;
  quantity?: number | null;
  unit_price?: number | null;
  amount?: number;
  description?: string | null;
}

export interface LedgerEntry {
  id: number;
  item_name: string;
  category: 'income' | 'expense';
  amount: number;
  record_date: string;
}

export interface ClinicDocument {
  id: number;
  doc_no: string;
  doc_type: DocumentType;
  doc_date: string;
  status: DocumentStatus;
  total_amount: number;
  supplier?: string | null;
  reason?: string | null;
  note?: string | null;
  patient_id?: number | null;
  patient?: DocumentPatient | null;
  void_reason?: string | null;
  void_by?: string | null;
  void_date?: string | null;
  create_by?: string;
  create_date?: string;
  item_count?: number;
  items?: DocumentItem[];
  ledger_entries?: LedgerEntry[];
}

// ส่งไปสร้างเอกสาร — field ของแต่ละบรรทัดตามประเภท (ดู CreateDocumentItemDto ฝั่ง backend)
export interface CreateDocumentItemPayload {
  item_type?: DocumentItemType;
  direction?: 'in' | 'out';
  category?: string;
  product_id?: number;
  product_lot_id?: number;
  lot_no?: string;
  manufacture_date?: string;
  expiry_date?: string;
  package_id?: number;
  pack_qty?: number;
  quantity?: number;
  unit_price?: number;
  amount?: number;
  description?: string;
}

export interface CreateDocumentPayload {
  doc_type: DocumentType;
  doc_date: string;
  supplier?: string;
  reason?: string;
  note?: string;
  patient_id?: number;
  items: CreateDocumentItemPayload[];
}

export interface DocumentQueryParams {
  doc_type?: DocumentType;
  status?: DocumentStatus;
  start_date?: string;
  end_date?: string;
  search?: string;
  patient_id?: number;
  product_id?: number;
  page?: number;
  limit?: number;
}

export interface DocumentListResponse {
  success: boolean;
  data: ClinicDocument[];
  meta: PaginatedMeta;
}

export interface DocumentResponse {
  success: boolean;
  message?: string;
  data: ClinicDocument;
}

export type DocumentSummary = { month: Record<DocumentType, { count: number; amount: number }> };

export interface DocumentSummaryResponse {
  success: boolean;
  data: DocumentSummary;
}
