import { Module } from '@nestjs/common';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { AuthModule } from '../auth/auth.module';
import { InventoryModule } from '../inventory/inventory.module';
import { DatabaseModule } from '../../config/database.module';

@Module({
  imports: [
    DatabaseModule, // Document / DocumentItem / FinanceRecord entities
    AuthModule,
    InventoryModule, // ตัด/เติมสต็อกภายใน DB transaction เดียวกับการสร้าง/ยกเลิกเอกสาร
  ],
  controllers: [DocumentController],
  providers: [DocumentService],
  exports: [DocumentService],
})
export class DocumentModule {}
