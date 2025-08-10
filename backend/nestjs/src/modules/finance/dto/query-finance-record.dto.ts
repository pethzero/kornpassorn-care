import { IsOptional, IsString, IsIn, IsDateString, IsNumber, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class QueryFinanceRecordDto {
  @IsOptional()
  @IsString()
  @IsIn(['income', 'expense'])
  category?: 'income' | 'expense';

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

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
  search?: string;

  @IsOptional()
  @IsString()
  @IsIn(['id', 'item_name', 'amount', 'record_date', 'created_at'])
  sort_by?: string = 'created_at';

  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'])
  @Transform(({ value }) => value?.toUpperCase())
  sort_order?: 'ASC' | 'DESC' = 'DESC';
}
