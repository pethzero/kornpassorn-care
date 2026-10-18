// \modules\patient\patient.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from '../../../database/entities/medical.entity'; // Adjust the import path as necessary

@Injectable()
export class PatientService {
  constructor(
    @InjectRepository(Patient)
    private patientRepository: Repository<Patient>,
  ) { }

  async nextCode(): Promise<string> {
    const [row] = await this.patientRepository.query(
      `SELECT patient_code FROM patients WHERE patient_code ~ '^[0-9]+$' ORDER BY patient_code::bigint DESC LIMIT 1`,
    );
    if (!row) return '000001';
    const width = Math.max(6, row.patient_code.length);
    return String(Number(row.patient_code) + 1).padStart(width, '0');
  }

  findAll() {
    return this.patientRepository.find();
  }

  findOne(id: number) {
    return this.patientRepository.findOne({ where: { id } });
  }

  async create(data: Partial<Patient>) {
    const clean = cleanPatient(data);
    await this.assertNationalIdFree(clean.national_id);
    return this.patientRepository.save(this.patientRepository.create(clean)).catch(friendlyDbError);
  }

  async update(id: number, data: Partial<Patient>) {
    const clean = cleanPatient(data);
    await this.assertNationalIdFree(clean.national_id, id);
    return this.patientRepository.update(id, { ...clean, updated_at: new Date() }).catch(friendlyDbError);
  }

  // เลขบัตรประชาชน 1 เลข = คนไข้ 1 คน (คอลัมน์ไม่ได้ unique ใน DB เพราะเป็นค่าว่างได้หลายแถว — เช็กตรงนี้แทน)
  private async assertNationalIdFree(nationalId?: string | null, exceptId?: number) {
    if (!nationalId) return;
    const other = await this.patientRepository.findOne({ where: { national_id: nationalId } });
    if (other && other.id !== exceptId) {
      throw new BadRequestException(`เลขบัตรประชาชนนี้มีอยู่แล้ว — คนไข้ ${other.patient_code} ${other.first_name} ${other.last_name}`);
    }
  }

  remove(id: number) {
    return this.patientRepository.delete(id).catch(friendlyDbError);
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
    INSERT INTO patients (patient_code, first_name, last_name, gender, date_of_birth, phone, email, address, blood_type)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (patient_code)
    DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      gender = EXCLUDED.gender,
      date_of_birth = EXCLUDED.date_of_birth,
      phone = EXCLUDED.phone,
      email = EXCLUDED.email,
      address = EXCLUDED.address,
      blood_type = EXCLUDED.blood_type
    RETURNING *
    `,
      [
        data.patient_code,
        data.first_name,
        data.last_name,
        data.gender,
        data.date_of_birth,
        data.phone,
        data.email,
        data.address,
        data.blood_type,
      ]
    );
  }

}

const EDITABLE: (keyof Patient)[] = [
  'patient_code', 'first_name', 'last_name', 'gender', 'date_of_birth',
  'phone', 'national_id', 'email', 'address', 'blood_type', 'is_active',
];

// รับเฉพาะ field ที่แก้ได้ (กัน body ส่ง id/created_at มาทับ) — ช่องว่างเก็บเป็น null (เช่น อีเมลไม่บังคับ)
function cleanPatient(data: Partial<Patient>): Partial<Patient> {
  const out: Record<string, unknown> = {};
  for (const key of EDITABLE) {
    if (data?.[key] === undefined) continue;
    const v = data[key];
    out[key] = typeof v === 'string' ? v.trim() || null : v;
  }
  // เลขบัตร: เก็บเฉพาะตัวเลข (รับ 1-2345-67890-12-3 ได้) และต้องถูกต้องตามหลักตรวจสอบ
  if (typeof out.national_id === 'string') {
    const digits = out.national_id.replace(/\D/g, '');
    if (!isValidThaiId(digits)) throw new BadRequestException('เลขบัตรประชาชนไม่ถูกต้อง (13 หลัก)');
    out.national_id = digits;
  }
  return out as Partial<Patient>;
}

// error จาก Postgres → ข้อความที่เจ้าหน้าที่อ่านเข้าใจ (เดิมหลุดเป็น 500)
function friendlyDbError(err: any): never {
  if (err?.code === '23505') throw new BadRequestException('รหัสคนไข้นี้มีอยู่แล้ว');
  if (err?.code === '23503') {
    throw new BadRequestException('ลบไม่ได้ — คนไข้มีเอกสาร/แบบสอบถามในระบบแล้ว (ประวัติต้องเก็บไว้)');
  }
  throw err;
}

// หลักที่ 13 = (11 - (ผลรวม หลักที่ i × (14 - i), i = 1..12) mod 11) mod 10
function isValidThaiId(id: string): boolean {
  if (!/^\d{13}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(id[i]) * (13 - i);
  return (11 - (sum % 11)) % 10 === Number(id[12]);
}
