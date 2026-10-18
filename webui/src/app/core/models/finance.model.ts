// src/app/core/models/finance.model.ts
export interface FinanceRecord {
  id?: number;
  category: 'income' | 'expense';
  amount: number;
  item_name: string;
  description?: string;
  record_date: string | Date;
  // มีค่า = ลงอัตโนมัติจากเอกสาร (แก้/ลบที่นี่ไม่ได้ ต้องยกเลิกที่เอกสาร), null = บันทึกเอง
  document_id?: number | null;
  document?: { id: number; doc_no: string; doc_type: string } | null;
  created_at?: string | Date;
  updated_at?: string | Date;
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
  // แยกที่มา: source = ประเภทเอกสาร (receive / patient_service) หรือ 'manual' (บันทึกเอง)
  by_source?: { category: 'income' | 'expense'; source: string; count: number; total: number }[];
  top_manual_expenses?: { item_name: string; count: number; total: number }[];
  // รายรับแยกตามบริการ (service = ชื่อบริการ, product = ยา/เวชภัณฑ์ที่ใช้กับคนไข้, manual = รายรับที่บันทึกเอง)
  income_breakdown?: { label: string; kind: 'service' | 'product' | 'manual'; count: number; total: number }[];
  service_stats?: { visits: number; patients: number };
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
  // document = ลงจากเอกสาร, manual = บันทึกเอง
  source?: 'document' | 'manual';
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

export interface TrendPoint {
  // YYYY-MM-DD (รายวัน) หรือ YYYY-MM (รายเดือน)
  bucket: string;
  income: number;
  expense: number;
  net: number;
}

export interface MonthlyFinance {
  // YYYY-MM
  month: string;
  income: number;
  expense: number;
  net: number;
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
