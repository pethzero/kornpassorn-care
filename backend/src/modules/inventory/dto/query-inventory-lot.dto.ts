import {
  IsOptional,
  IsNumber,
  Min,
  IsDateString,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryInventoryLotDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  product_id?: number;

  // ใช้หาล็อตที่จะหมดอายุก่อนวันที่ระบุ (แจ้งเตือนยาใกล้หมดอายุ)
  @IsOptional()
  @IsDateString()
  expiring_before?: string;

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
