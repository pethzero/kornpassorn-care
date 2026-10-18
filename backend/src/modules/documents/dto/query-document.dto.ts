import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { DOCUMENT_TYPES, DocumentType } from '../../../database/entities/document.entity';

export class QueryDocumentDto {
  @IsOptional()
  @IsIn(DOCUMENT_TYPES as unknown as string[])
  doc_type?: DocumentType;

  @IsOptional()
  @IsIn(['confirmed', 'void'])
  status?: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  // เลขที่เอกสาร / หมายเหตุ / ผู้ขาย / ชื่อคนไข้
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  patient_id?: number;

  // เอกสารที่มีสินค้านี้อยู่ (ใช้จากหน้าสินค้า/ล็อต)
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  product_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}
