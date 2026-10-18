import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../config/database.module';
import { AuthModule } from '../auth/auth.module';
import { AppointmentController } from './appointment.controller';
import { AppointmentService } from './appointment.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [AppointmentController],
  providers: [AppointmentService],
  exports: [AppointmentService], // public API v1 ใช้อ่านนัดหมาย
})
export class AppointmentModule {}
