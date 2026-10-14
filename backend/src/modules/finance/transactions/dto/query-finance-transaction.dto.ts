import {
  IsOptional,
  IsString,
  IsIn,
  IsDateString,
  IsNumber,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class QueryFinanceTransactionDto {
  @IsOptional()
  @IsString()
  @IsIn(['sale', 'purchase', 'patient_service', 'income', 'expense', 'mixed'])
  doc_type?: string;

  @IsOptional()
  @IsString()
  @IsIn(['draft', 'confirmed', 'void'])
  status?: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  // ค้นหาด้วยเลขที่เอกสาร หรือ note
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  patient_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  @IsIn(['id', 'doc_no', 'doc_date', 'create_date', 'net_amount'])
  sort_by?: string = 'doc_date';

  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'])
  @Transform(({ value }) => value?.toUpperCase())
  sort_order?: 'ASC' | 'DESC' = 'DESC';
}
