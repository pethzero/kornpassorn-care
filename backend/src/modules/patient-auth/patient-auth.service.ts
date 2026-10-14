import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Request } from 'express';

import { Patient } from '../../database/entities/medical.entity';
import { PatientOtp } from '../../database/entities/patient-otp.entity';
import { AuthService } from '../auth/auth.service';
import { OtpSenderService } from './otp-sender.service';
import { UpdatePatientProfileDto } from './dto/update-profile.dto';

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

@Injectable()
export class PatientAuthService {
  constructor(
    @InjectRepository(Patient) private readonly patientRepo: Repository<Patient>,
    @InjectRepository(PatientOtp) private readonly otpRepo: Repository<PatientOtp>,
    private readonly authService: AuthService,
    private readonly otpSender: OtpSenderService,
  ) {}

  private hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  async requestOtp(phone: string) {
    const recent = await this.otpRepo.findOne({ where: { phone }, order: { created_at: 'DESC' } });
    if (recent && Date.now() - recent.created_at.getTime() < OTP_COOLDOWN_MS) {
      throw new BadRequestException('กรุณารอสักครู่ก่อนขอรหัสใหม่');
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    await this.otpRepo.save(
      this.otpRepo.create({
        phone,
        otp_hash: this.hashOtp(otp),
        expires_at: new Date(Date.now() + OTP_TTL_MS),
      }),
    );

    await this.otpSender.send(phone, otp);

    return {
      success: true,
      expires_in: OTP_TTL_MS / 1000,
      ...(process.env.NODE_ENV !== 'production' ? { devOtp: otp } : {}),
    };
  }

  async verifyOtp(phone: string, otp: string, req: Request, deviceInfo?: any) {
    const record = await this.otpRepo.findOne({ where: { phone }, order: { created_at: 'DESC' } });

    if (!record || record.consumed_at || record.expires_at < new Date()) {
      await this.authService.logPatientLogin(null, false, req, 'OTP invalid or expired');
      throw new UnauthorizedException('รหัส OTP ไม่ถูกต้องหรือหมดอายุ');
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      await this.authService.logPatientLogin(null, false, req, 'Too many OTP attempts');
      throw new UnauthorizedException('กรอกรหัสผิดเกินจำนวนครั้งที่กำหนด กรุณาขอรหัสใหม่');
    }

    if (record.otp_hash !== this.hashOtp(otp)) {
      record.attempts += 1;
      await this.otpRepo.save(record);
      await this.authService.logPatientLogin(null, false, req, 'Invalid OTP');
      throw new UnauthorizedException('รหัส OTP ไม่ถูกต้อง');
    }

    record.consumed_at = new Date();
    await this.otpRepo.save(record);

    let patient = await this.patientRepo.findOne({ where: { phone } });
    if (!patient) {
      patient = await this.patientRepo.save(
        this.patientRepo.create({
          patient_code: `PT${Date.now()}`,
          first_name: '-',
          last_name: '-',
          phone,
        }),
      );
    }

    const tokens = await this.authService.issueTokenPair(
      { id: String(patient.id), username: patient.phone, role: 'patient' },
      true,
      deviceInfo,
      'patient',
    );

    await this.authService.logPatientLogin(patient, true, req);

    return { patient, tokens };
  }

  async getProfile(patientId: number) {
    const patient = await this.patientRepo.findOne({ where: { id: patientId } });
    if (!patient) throw new NotFoundException('ไม่พบข้อมูลผู้ป่วย');
    return patient;
  }

  async updateProfile(patientId: number, dto: UpdatePatientProfileDto) {
    await this.getProfile(patientId);
    await this.patientRepo.update(patientId, dto as any);
    return this.getProfile(patientId);
  }
}
