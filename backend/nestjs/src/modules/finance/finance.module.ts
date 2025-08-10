import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { FinanceRecord } from '../../database/entities/finance-record.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FinanceRecord])],
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [FinanceService], // Export เพื่อใช้ใน modules อื่น
})
export class FinanceModule {}
