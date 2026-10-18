// src/app/core/models/api-client.model.ts
export interface ApiClient {
  id: number;
  name: string;
  client_id: string;
  // 4 ตัวท้ายของ secret (ตัวเต็มแสดงครั้งเดียวตอนสร้าง)
  secret_hint: string;
  scopes: string[];
  is_active: boolean;
  is_expired: boolean;
  expires_at?: string | null;
  last_used_at?: string | null;
  note?: string | null;
  create_by?: string;
  create_date?: string;
}

export interface ApiScopeInfo {
  key: string;
  description: string;
}

// ผลจากสร้าง/สร้าง secret ใหม่ — client_secret มีครั้งเดียว
export interface ApiClientWithSecret {
  client: ApiClient;
  client_secret: string;
}

export interface ApiClientPayload {
  name: string;
  scopes: string[];
  expires_at?: string | null;
  note?: string | null;
}
