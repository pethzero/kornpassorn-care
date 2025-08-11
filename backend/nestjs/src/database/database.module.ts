import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserToken } from './entities/user-token.entity';
import { LoginLog } from './entities/login-log.entity';
import { FinanceRecord } from './entities/finance-record.entity';
import { Patient, MedicalRecord } from './entities/medical.entity';
import { DatabaseService } from './database.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserToken,
      LoginLog,
      FinanceRecord,
      Patient,
      MedicalRecord,
    ])
  ],
  providers: [DatabaseService],
  exports: [TypeOrmModule, DatabaseService],
})
export class DatabaseModule {}