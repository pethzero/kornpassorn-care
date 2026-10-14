import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateInventoryLotDto } from './create-inventory-lot.dto';

// แก้ไข lot ที่มีอยู่แล้ว — ห้ามย้ายไปสินค้าอื่น (ไม่รับ product_id)
// ถ้า lot มีการเคลื่อนไหวจากรายการการเงินแล้ว service จะปฏิเสธการแก้ไขทั้งหมด (ดู InventoryService.updateLot)
export class UpdateInventoryLotDto extends PartialType(
  OmitType(CreateInventoryLotDto, ['product_id'] as const),
) {}
