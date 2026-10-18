import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../config/database.module';
import { AuthModule } from '../auth/auth.module';

import { HospitalScheduleController } from './hospital-schedule.controller';
import { HospitalScheduleService } from './hospital-schedule.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [HospitalScheduleController],
  providers: [HospitalScheduleService],
  exports: [HospitalScheduleService], // ให้ public API v1 อ่านเวลาทำการได้
})
export class HospitalScheduleModule {}
