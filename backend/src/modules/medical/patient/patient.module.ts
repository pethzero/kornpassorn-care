import { Module } from '@nestjs/common';
import { PatientService } from './patient.service';
import { PatientController } from './patient.controller';
import { DatabaseModule } from '../../../database/database.module';

@Module({
  imports: [DatabaseModule], // Provides Patient and MedicalRecord entities
  providers: [PatientService],
  controllers: [PatientController],
  exports: [PatientService],
})
export class PatientModule {}