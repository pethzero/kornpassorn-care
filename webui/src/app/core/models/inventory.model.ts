// src/app/core/models/inventory.model.ts
export type InventoryProductCategory = 'medicine' | 'supply' | 'other';

// แบบบรรจุที่ซื้อเข้า — สินค้า 1 ตัวมีได้หลายแบบ เช่น "กล่อง 40 เม็ด", "แผง 10 เม็ด", "แท่งเล็ก"
export interface InventoryProductPackage {
  id?: number;
  product_id?: number;
  // ชื่อแบบบรรจุ (ไม่ซ้ำในสินค้าเดียวกัน)
  name: string;
  // หน่วยที่ซื้อเข้า เช่น "กล่อง", "แผง"
  pack_unit: string;
  // จำนวน product.unit ต่อ 1 pack_unit
  pack_size: number;
  barcode?: string;
  // ลักษณะของแบบนี้ เช่น "เม็ดสีขาว เคลือบฟิล์ม"
  description?: string | null;
  // หมายเหตุภายใน เช่น "สั่งจากร้าน A"
  note?: string | null;
  last_pack_cost?: number;
  is_default?: boolean;
  is_active?: boolean;
}

export interface InventoryProduct {
  id?: number;
  sku?: string;
  name: string;
  // ยี่ห้อ/ผู้ผลิต — 1 สินค้า = 1 ยี่ห้อ (ยาตัวเดียวกันต่างยี่ห้อ = คนละสินค้า)
  brand?: string | null;
  generic_name?: string;
  strength?: string;
  dosage_form?: string;
  category: InventoryProductCategory;
  // หน่วยที่ตัดสต็อก/จ่ายจริง เช่น "เม็ด"
  unit?: string;
  sell_price?: number;
  // คงเหลือต่ำกว่านี้ (หน่วย unit) = ควรสั่งซื้อ
  reorder_level?: number;
  description?: string;
  is_active?: boolean;
  create_date?: string;
  packages?: InventoryProductPackage[];
  // คงเหลือรวมทุกล็อต (คำนวณฝั่ง backend)
  stock_remaining?: number;
}

export interface InventoryProductLot {
  id?: number;
  product_id: number;
  product?: InventoryProduct;
  lot_no: string;
  manufacture_date?: string;
  expiry_date?: string;
  // แบบบรรจุที่รับเข้า + snapshot ของ pack_unit/pack_size ตอนรับ
  package_id?: number | null;
  package?: InventoryProductPackage | null;
  pack_unit?: string | null;
  pack_size?: number | null;
  // ส่งอย่างใดอย่างหนึ่ง: quantity_in (หน่วย unit) หรือ received_pack_qty (หน่วย pack_unit) ตอนสร้าง
  quantity_in?: number;
  received_pack_qty?: number;
  quantity_remaining?: number;
  unit_cost?: number;
  pack_unit_cost?: number;
  supplier?: string;
  // ยี่ห้อตอนรับเข้า (สำเนาจากสินค้า — ต่างจาก supplier ซึ่งเป็นร้านที่ซื้อมา)
  brand?: string | null;
  received_date?: string;
  note?: string;
  modify_by?: string;
  modify_date?: string;
  // true = มีรายการการเงินอ้างอิง lot นี้แล้ว แก้ไขไม่ได้อีก (คำนวณฝั่ง backend)
  is_locked?: boolean;
}

// ประวัติล็อต 1 ครั้ง — kind: opening = ตั้งยอดยกมา, document = ตามเอกสาร, reversal = คืนตอนยกเลิกเอกสาร
export interface LotMovement {
  id: number;
  kind: 'opening' | 'document' | 'reversal';
  movement_type: 'in' | 'out' | 'adjust';
  // + เข้า / − ออก (หน่วย product.unit)
  quantity: number;
  balance: number;
  date: string;
  moved_date: string;
  note?: string | null;
  document?: { id: number; doc_no: string; doc_type: string; status: string; party?: string | null } | null;
}

export interface LotMovementsResult {
  lot: { id: number; lot_no: string; product_name?: string; unit?: string; quantity_in: number; quantity_remaining: number };
  movements: LotMovement[];
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

// ชื่อสินค้าที่แสดง: "Paracetamol 500 mg · Sara" — ชื่อเดียวกันคนละยี่ห้อต้องแยกออกได้ทุกที่ที่เลือก/แสดงสินค้า
export function productLabel(p?: { name?: string; brand?: string | null } | null): string {
  if (!p?.name) return '';
  return p.brand ? `${p.name} · ${p.brand}` : p.name;
}

// แบบบรรจุที่แสดง: "กล่อง 40 เม็ด (1 กล่อง = 40 เม็ด)"
export function packageLabel(pkg: { name: string; pack_unit: string; pack_size: number }, unit?: string | null): string {
  const size = `1 ${pkg.pack_unit} = ${pkg.pack_size} ${unit || ''}`.trim();
  return pkg.name.includes(String(pkg.pack_size)) ? pkg.name : `${pkg.name} (${size})`;
}
