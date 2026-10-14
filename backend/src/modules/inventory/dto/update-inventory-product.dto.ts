import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateInventoryProductDto } from './create-inventory-product.dto';

export class UpdateInventoryProductDto extends PartialType(CreateInventoryProductDto) {
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
