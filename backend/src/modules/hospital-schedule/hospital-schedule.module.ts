import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../config/database.module';
import { AuthModule } from '../auth/auth.module';

import { HospitalScheduleController } from './hospital-schedule.controller';
import { HospitalScheduleService } from './hospital-schedule.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [HospitalScheduleController],
  providers: [HospitalScheduleService],
})
export class HospitalScheduleModule {}
