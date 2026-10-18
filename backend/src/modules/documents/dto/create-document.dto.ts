import {
  ArrayMinSize,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DOCUMENT_TYPES, DocumentType } from '../../../database/entities/document.entity';

// 1 บรรทัดในเอกสาร — field ที่ต้องใช้ขึ้นกับประเภทเอกสาร (ตรวจละเอียดใน DocumentService)
//   receive          : product_id, lot_no, (package_id + pack_qty) หรือ quantity, unit_price/amount
//   issue            : product_id, quantity, product_lot_id (ไม่ระบุ = FEFO)
//   patient_service  : service → category + amount | product → product_id, quantity, unit_price (ไม่ระบุ = ราคาขายสินค้า)
//   adjust           : product_id, direction, quantity, product_lot_id (บังคับเมื่อ direction = in)
export class CreateDocumentItemDto {
  @IsOptional()
  @IsIn(['product', 'service', 'other'])
  item_type?: 'product' | 'service' | 'other';

  // ใช้กับ adjust เท่านั้น — ประเภทอื่นกำหนดทิศทางให้เองตามประเภทเอกสาร
  @IsOptional()
  @IsIn(['in', 'out'])
  direction?: 'in' | 'out';

  // ชื่อบริการ เช่น "ล้างแผล"
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  product_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  product_lot_id?: number;

  // ----- เฉพาะ receive -----
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  lot_no?: string;

  @IsOptional()
  @IsDateString()
  manufacture_date?: string;

  @IsOptional()
  @IsDateString()
  expiry_date?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  package_id?: number;

  // จำนวนตามหน่วยบรรจุของ package (เช่น 3 กล่อง) — ระบุคู่กับ package_id แทน quantity
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  pack_qty?: number;

  // -----

  // จำนวนเป็นหน่วยย่อย (product.unit)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  quantity?: number;

  // ราคาต่อหน่วยที่กรอก: ต่อแพ็คถ้าใช้ pack_qty, ไม่งั้นต่อหน่วยย่อย
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  unit_price?: number;

  // ไม่ระบุ = คำนวณจาก unit_price × จำนวน
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class CreateDocumentDto {
  @IsIn(DOCUMENT_TYPES as unknown as string[])
  doc_type: DocumentType;

  @IsDateString()
  doc_date: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  supplier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  patient_id?: number;

  @ValidateNested({ each: true })
  @Type(() => CreateDocumentItemDto)
  @ArrayMinSize(1)
  items: CreateDocumentItemDto[];
}

export class VoidDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
