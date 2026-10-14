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

// รับสินค้าเข้าล็อตใหม่โดยตรง (เช่น ตั้งสต็อกเริ่มต้น) — ถ้ารับเข้าผ่านรายการซื้อ (finance transaction)
// ให้ใช้ item.new_lot ใน CreateFinanceTransactionDto แทน เพื่อให้ผูกกับเอกสารการเงินด้วย
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

  // จำนวนรับเข้าเป็นหน่วยจ่ายจริง (product.unit เช่น "เม็ด") — ระบุอย่างใดอย่างหนึ่งกับ received_pack_qty
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  quantity_in?: number;

  // จำนวนรับเข้าเป็นหน่วยซื้อ (product.pack_unit เช่น "กล่อง") — service จะคูณ pack_size ให้เป็น quantity_in อัตโนมัติ
  // ใช้ได้เฉพาะสินค้าที่ตั้ง pack_unit/pack_size ไว้แล้วเท่านั้น
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

  // เจ้าของยี่ห้อ/ผู้ผลิต
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
