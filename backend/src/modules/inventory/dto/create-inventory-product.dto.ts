import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsInt,
  IsNumber,
  IsPositive,
  IsBoolean,
  Min,
  MaxLength,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

// ยี่ห้อ + ขนาดบรรจุ 1 แบบ — ส่งมาพร้อมสินค้าตอนสร้าง/แก้ไข
// มี id = แก้ของเดิม, ไม่มี id = เพิ่มใหม่, ของเดิมที่ไม่ได้ส่งมา = ลบ (หรือปิดใช้งานถ้ามีล็อตอ้างอิงแล้ว)
export class InventoryProductPackageInputDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  id?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  brand: string;

  // หน่วยที่ซื้อเข้า เช่น "กล่อง", "แผง"
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  pack_unit: string;

  // จำนวน product.unit ต่อ 1 pack_unit เช่น 1 กล่อง = 40 เม็ด
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  pack_size: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  barcode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  last_pack_cost?: number;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class CreateInventoryProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sku?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  generic_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  strength?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  dosage_form?: string;

  @IsOptional()
  @IsString()
  @IsIn(['medicine', 'supply', 'other'])
  category?: string;

  // หน่วยที่ตัดสต็อก/จ่ายจริง เช่น "เม็ด"
  @IsOptional()
  @IsString()
  @MaxLength(30)
  unit?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  sell_price?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  reorder_level?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  // ไม่ส่ง = ไม่แตะ packages เดิม, ส่ง [] = ลบทั้งหมด
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryProductPackageInputDto)
  packages?: InventoryProductPackageInputDto[];
}
