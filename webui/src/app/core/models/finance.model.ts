// src/app/core/models/finance.model.ts
export interface FinanceRecord {
  id?: number;
  category: 'income' | 'expense';
  amount: number;
  item_name: string;
  description?: string;
  record_date: string | Date;
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
