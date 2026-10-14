import { Module } from '@nestjs/common';
import { FinanceTransactionService } from './finance-transaction.service';
import { FinanceTransactionController } from './finance-transaction.controller';
import { AuthModule } from '../../auth/auth.module';
import { InventoryModule } from '../../inventory/inventory.module';
import { DatabaseModule } from '../../../config/database.module';

@Module({
  imports: [
    DatabaseModule, // Provides FinanceTransaction / FinanceTransactionItem entities
    AuthModule,
    InventoryModule, // ใช้ตัด/เติมสต็อกสินค้าภายใน DB transaction เดียวกันตอนสร้าง/ยกเลิกเอกสาร
  ],
  controllers: [FinanceTransactionController],
  providers: [FinanceTransactionService],
  exports: [FinanceTransactionService],
})
export class FinanceTransactionModule {}
