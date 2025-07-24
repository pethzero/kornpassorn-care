// \modules\patient\patient.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from '../../../database/entities/medical.entity'; // Adjust the import path as necessary

@Injectable()
export class PatientService {
  constructor(
    @InjectRepository(Patient)
    private patientRepository: Repository<Patient>,
  ) { }

  findAll() {
    return this.patientRepository.find();
  }

  findOne(id: number) {
    return this.patientRepository.findOne({ where: { id } });
  }

  create(data: Partial<Patient>) {
    const patient = this.patientRepository.create(data);
    return this.patientRepository.save(patient);
  }

  update(id: number, data: Partial<Patient>) {
    return this.patientRepository.update(id, data);
  }

  remove(id: number) {
    return this.patientRepository.delete(id);
  }

  async updateOrCreate(criteria: Partial<Patient>, data: Partial<Patient>) {
    let patient = await this.patientRepository.findOne({ where: criteria });
    if (patient) {
      await this.patientRepository.update(patient.id, data);
      return this.patientRepository.findOne({ where: { id: patient.id } });
    } else {
      patient = this.patientRepository.create({ ...criteria, ...data });
      return this.patientRepository.save(patient);
    }
  }

  async upsertRaw(data: Partial<Patient>) {
    // ใช้ ON CONFLICT (Postgres)
    return this.patientRepository.query(
      `
    INSERT INTO patients (patient_code, first_name, last_name)
    VALUES ($1, $2, $3)
    ON CONFLICT (patient_code)
    DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name
    RETURNING *
    `,
      [data.patient_code, data.first_name, data.last_name]
    );
  }

}