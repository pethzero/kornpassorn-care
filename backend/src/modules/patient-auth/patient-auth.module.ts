import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../config/database.module';
import { AuthModule } from '../auth/auth.module';

import { PatientAuthController } from './patient-auth.controller';
import { PatientAuthService } from './patient-auth.service';
import { OtpSenderService } from './otp-sender.service';

@Module({
  imports: [DatabaseModule, AuthModule], // DatabaseModule provides Patient/PatientOtp repos; AuthModule provides AuthService
  controllers: [PatientAuthController],
  providers: [PatientAuthService, OtpSenderService],
})
export class PatientAuthModule {}
