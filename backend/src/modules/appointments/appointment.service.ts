import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from '../../database/entities/appointment.entity';
import { Patient } from '../../database/entities/medical.entity';
import { CreateAppointmentDto, QueryAppointmentDto, UpdateAppointmentDto } from './dto/appointment.dto';

@Injectable()
export class AppointmentService {
  constructor(
    @InjectRepository(Appointment) private readonly repo: Repository<Appointment>,
    @InjectRepository(Patient) private readonly patientRepo: Repository<Patient>,
  ) {}

  // ใช้ร่วมกันทั้งหน้าเจ้าหน้าที่ และ public API v1 (v1 เลือก field ที่ส่งออกเองอีกชั้น)
  async findAll(query: QueryAppointmentDto) {
    const { date_from, date_to, status, patient_id, search, limit = 200 } = query;
    const qb = this.repo.createQueryBuilder('a').leftJoinAndSelect('a.patient', 'patient');
    if (date_from) qb.andWhere('a.appointment_date >= :date_from', { date_from });
    if (date_to) qb.andWhere('a.appointment_date <= :date_to', { date_to });
    if (status) qb.andWhere('a.status = :status', { status });
    if (patient_id) qb.andWhere('a.patient_id = :patient_id', { patient_id });
    if (search) {
      qb.andWhere(
        '(patient.first_name ILIKE :s OR patient.last_name ILIKE :s OR patient.patient_code ILIKE :s OR a.service ILIKE :s)',
        { s: `%${search}%` },
      );
    }
    return qb
      .orderBy('a.appointment_date', 'ASC')
      .addOrderBy('a.start_time', 'ASC')
      .take(Math.min(Number(limit) || 200, 500))
      .getMany();
  }

  async findOne(id: number) {
    const appt = await this.repo.findOne({ where: { id }, relations: ['patient'] });
    if (!appt) throw new NotFoundException(`ไม่พบนัดหมาย ID: ${id}`);
    return appt;
  }

  async create(dto: CreateAppointmentDto, currentUser?: string) {
    await this.ensurePatient(dto.patient_id);
    this.validateTimes(dto.start_time, dto.end_time);
    const saved = await this.repo.save(
      this.repo.create({ ...dto, status: dto.status ?? 'scheduled', create_by: currentUser || 'system' }),
    );
    return this.findOne(saved.id);
  }

  async update(id: number, dto: UpdateAppointmentDto, currentUser?: string) {
    const appt = await this.repo.findOne({ where: { id } });
    if (!appt) throw new NotFoundException(`ไม่พบนัดหมาย ID: ${id}`);
    if (dto.patient_id) await this.ensurePatient(dto.patient_id);
    this.validateTimes(dto.start_time ?? appt.start_time, dto.end_time !== undefined ? dto.end_time : appt.end_time);
    Object.assign(appt, dto, { modify_by: currentUser || 'system', modify_date: new Date() });
    await this.repo.save(appt);
    return this.findOne(id);
  }

  async remove(id: number) {
    const appt = await this.findOne(id);
    await this.repo.delete(id);
    return { id, service: appt.service };
  }

  private async ensurePatient(id: number) {
    if (!(await this.patientRepo.exist({ where: { id } }))) throw new BadRequestException(`ไม่พบคนไข้ ID ${id}`);
  }

  private validateTimes(start?: string | null, end?: string | null) {
    if (start && end && end.slice(0, 5) <= start.slice(0, 5)) {
      throw new BadRequestException('เวลาสิ้นสุดต้องหลังเวลาเริ่ม');
    }
  }
}
