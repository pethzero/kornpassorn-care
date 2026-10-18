import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsPositive,
  IsDateString,
  MaxLength,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

// ตั้งยอดยกมา: รับสินค้าเข้าล็อตโดยตรง ไม่ผ่านเอกสาร — ซื้อของเข้าจริงให้ใช้เอกสารรับของเข้า (POST /documents, doc_type=receive)
// เพื่อให้มีเลขที่เอกสารและลงบัญชีการเงินด้วย
export class CreateInventoryLotDto {
  @IsInt()
  @Type(() => Number)
  product_id: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  lot_no: string;

  @IsOptional()
  @IsDateString()
  manufacture_date?: string;

  @IsOptional()
  @IsDateString()
  expiry_date?: string;

  // ยี่ห้อ/ขนาดบรรจุที่รับเข้า (InventoryProductPackage ของสินค้านี้) — ถ้าระบุ จะ copy brand/pack_unit/pack_size มาเก็บที่ล็อต
  // และต้องระบุเพื่อกรอกจำนวนเป็น received_pack_qty
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  package_id?: number | null;

  // จำนวนรับเข้าเป็นหน่วยจ่ายจริง (product.unit เช่น "เม็ด") — ระบุอย่างใดอย่างหนึ่งกับ received_pack_qty
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  quantity_in?: number;

  // จำนวนรับเข้าเป็นหน่วยซื้อ (package.pack_unit เช่น "กล่อง") — service จะคูณ package.pack_size ให้เป็น quantity_in อัตโนมัติ
  // ต้องระบุ package_id คู่กันเสมอ
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  received_pack_qty?: number;

  // ต้นทุนต่อหน่วยจ่ายจริง — ระบุอย่างใดอย่างหนึ่งกับ pack_unit_cost
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  unit_cost?: number;

  // ต้นทุนต่อหน่วยซื้อ (เช่น ราคา/กล่อง) — service จะหารด้วย pack_size ให้เป็น unit_cost อัตโนมัติ
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  pack_unit_cost?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  supplier?: string;

  // เจ้าของยี่ห้อ/ผู้ผลิต — ใช้เฉพาะตอนไม่ได้เลือก package (ถ้าเลือก package จะใช้ package.brand แทน)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @IsOptional()
  @IsDateString()
  received_date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}
