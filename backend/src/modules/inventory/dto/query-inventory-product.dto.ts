import {
  IsOptional,
  IsString,
  IsIn,
  IsNumber,
  Min,
  IsBooleanString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryInventoryProductDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  @IsIn(['medicine', 'supply', 'other'])
  category?: string;

  @IsOptional()
  @IsBooleanString()
  is_active?: string;

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
