import { Module } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../../config/database.module';

@Module({
  imports: [
    DatabaseModule, // Provides FinanceRecord entity via TypeOrmModule
    AuthModule, // Import AuthModule เพื่อใช้ authentication guards
  ],
  controllers: [FinanceController],
  providers: [
    FinanceService,
  ],
  exports: [FinanceService], // Export เพื่อใช้ใน modules อื่น
})
export class FinanceModule {}
