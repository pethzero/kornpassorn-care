import { IsString, IsNotEmpty, IsIn, IsNumber, IsPositive, IsDateString, MaxLength, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFinanceRecordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  item_name: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['income', 'expense'])
  category: 'income' | 'expense';

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  amount: number;

  @IsDateString()
  record_date: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
