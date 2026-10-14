import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsInt,
  IsPositive,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

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
  @IsIn(['medicine', 'supply', 'other'])
  category?: string;

  // หน่วยที่ตัดสต็อก/จ่ายจริง เช่น "เม็ด"
  @IsOptional()
  @IsString()
  @MaxLength(30)
  unit?: string;

  // หน่วยที่ซื้อเข้า ถ้าต่างจาก unit เช่น "กล่อง" — ต้องระบุคู่กับ pack_size เสมอ
  @IsOptional()
  @IsString()
  @MaxLength(30)
  pack_unit?: string;

  // จำนวน unit ต่อ 1 pack_unit เช่น 1 กล่อง = 30 เม็ด
  @ValidateIf((o) => !!o.pack_unit)
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  pack_size?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
