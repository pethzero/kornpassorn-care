// src/app/core/models/finance-transaction.model.ts
import { InventoryProduct, InventoryProductLot, PaginatedMeta } from './inventory.model';

export type TransactionDirection = 'in' | 'out';
export type TransactionItemType = 'product' | 'service' | 'other';
export type TransactionDocType = 'sale' | 'purchase' | 'patient_service' | 'income' | 'expense' | 'mixed';
export type TransactionStatus = 'draft' | 'confirmed' | 'void';

export interface NewLotInline {
  lot_no: string;
  manufacture_date?: string;
  expiry_date?: string;
}

export interface FinanceTransactionItem {
  id?: number;
  line_no?: number;
  direction: TransactionDirection;
  item_type?: TransactionItemType;
  category?: string;
  product_id?: number;
  product?: InventoryProduct;
  product_lot_id?: number;
  product_lot?: InventoryProductLot;
  new_lot?: NewLotInline;
  quantity?: number;
  unit_price?: number;
  amount: number;
  description?: string;
  ref_type?: string;
  ref_id?: number;
}

export interface FinanceTransactionPatient {
  id: number;
  patient_code: string;
  first_name: string;
  last_name: string;
}

export interface FinanceTransaction {
  id?: number;
  doc_no?: string;
  doc_type: TransactionDocType;
  doc_date: string;
  status?: TransactionStatus;
  total_in?: number;
  total_out?: number;
  net_amount?: number;
  note?: string;
  patient_id?: number;
  patient?: FinanceTransactionPatient;
  create_by?: string;
  create_date?: string;
  items: FinanceTransactionItem[];
}

export interface CreateFinanceTransactionPayload {
  doc_type: TransactionDocType;
  doc_date: string;
  note?: string;
  // บังคับระบุเมื่อ doc_type = 'patient_service' (เช็คฝั่ง backend)
  patient_id?: number;
  items: FinanceTransactionItem[];
}

export interface FinanceTransactionQueryParams {
  doc_type?: TransactionDocType;
  status?: TransactionStatus;
  start_date?: string;
  end_date?: string;
  search?: string;
  patient_id?: number;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

export interface FinanceTransactionListResponse {
  success: boolean;
  data: FinanceTransaction[];
  meta: PaginatedMeta;
}

export interface FinanceTransactionItemResponse {
  success: boolean;
  message?: string;
  data: FinanceTransaction;
}

export interface FinanceTransactionSummaryPeriod {
  total_in: number;
  total_out: number;
  net_amount: number;
  count: number;
}

export interface FinanceTransactionSummary {
  today: FinanceTransactionSummaryPeriod;
  year: FinanceTransactionSummaryPeriod & { year: number };
}

export interface FinanceTransactionSummaryResponse {
  success: boolean;
  data: FinanceTransactionSummary;
}
