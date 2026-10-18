import { Module } from '@nestjs/common';
import { ApiClientModule } from '../api-clients/api-client.module';
import { AppointmentModule } from '../appointments/appointment.module';
import { HospitalScheduleModule } from '../hospital-schedule/hospital-schedule.module';
import { PublicApiController } from './public-api.controller';

// /api/v1/* — API สำหรับระบบภายนอก (ยืนยันตัวด้วย api_clients)
@Module({
  imports: [ApiClientModule, AppointmentModule, HospitalScheduleModule],
  controllers: [PublicApiController],
})
export class PublicApiModule {}
