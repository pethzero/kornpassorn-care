import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../../config/database.module';

@Module({
  imports: [
    DatabaseModule, // Provides InventoryProduct / InventoryProductLot / InventoryStockMovement entities
    AuthModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService], // ให้ FinanceTransactionModule เรียกใช้ตัดสต็อกภายใน transaction เดียวกันได้
})
export class InventoryModule {}
