import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsNumber,
  IsPositive,
  IsInt,
  IsDateString,
  MaxLength,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

// ใช้เมื่อรายการนี้เป็นการซื้อสินค้าเข้าสต็อกเป็นล็อตใหม่ (เช่น ซื้อยาลอตใหม่เข้าคลัง)
export class NewLotInlineDto {
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
}

export class CreateFinanceTransactionItemDto {
  // 'in' = เงินรับ, 'out' = เงินจ่าย
  @IsString()
  @IsIn(['in', 'out'])
  direction: 'in' | 'out';

  @IsOptional()
  @IsString()
  @IsIn(['product', 'service', 'other'])
  item_type?: 'product' | 'service' | 'other';

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  // ระบุเมื่อ item_type = 'product'
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  product_id?: number;

  // ระบุล็อตตรงๆ: ตอน direction='out' ใช้ตัดสต็อกล็อตนี้โดยเฉพาะ (ข้าม FEFO),
  // ตอน direction='in' ใช้เติมสต็อกกลับเข้าล็อตที่มีอยู่แล้ว (restock)
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  product_lot_id?: number;

  // ระบุเมื่อ direction='in' + item_type='product' และเป็นการซื้อเข้าล็อตใหม่ (ไม่ใช่ restock ล็อตเดิม)
  @IsOptional()
  @ValidateNested()
  @Type(() => NewLotInlineDto)
  new_lot?: NewLotInlineDto;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  quantity?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  unit_price?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  // ช่องเชื่อมอนาคต เช่น ref_type='patient_dispensing', ref_id=<id ใบจ่ายยา>
  @IsOptional()
  @IsString()
  @MaxLength(50)
  ref_type?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  ref_id?: number;
}

export class CreateFinanceTransactionDto {
  @IsString()
  @IsIn(['sale', 'purchase', 'patient_service', 'income', 'expense', 'mixed'])
  doc_type: string;

  @IsDateString()
  doc_date: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  // บังคับระบุเมื่อ doc_type = 'patient_service' (เช็คใน service) — โยงเอกสารไปหาคนไข้ที่ถูกเรียกเก็บเงิน
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  patient_id?: number;

  @ValidateNested({ each: true })
  @Type(() => CreateFinanceTransactionItemDto)
  @ArrayMinSize(1)
  items: CreateFinanceTransactionItemDto[];
}
