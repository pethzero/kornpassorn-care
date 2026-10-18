import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppSetting } from '../../database/entities/app-setting.entity';
import { ClinicSettingsDto } from './settings.dto';

const CLINIC_KEY = 'clinic';

// ค่าเริ่มต้นตอนยังไม่เคยตั้ง — รายการบริการเดิมที่เคยฝังในหน้าเอกสาร/นัดหมาย
export const DEFAULT_CLINIC_SETTINGS = {
  clinic: { name: 'Kornpassorn Care', address: '', phone: '', email: '', tax_id: '', line_id: '' },
  services: ['ล้างแผล', 'ทำแผล', 'ฉีดยา', 'เจาะเลือด', 'วัดความดัน', 'พ่นยา', 'ให้น้ำเกลือ', 'ค่าตรวจรักษา', 'ตรวจติดตามอาการ', 'ค่าบริการอื่นๆ'].map(
    (name) => ({ name, price: null as number | null, active: true }),
  ),
};

@Injectable()
export class SettingsService {
  constructor(@InjectRepository(AppSetting) private readonly repo: Repository<AppSetting>) {}

  async getClinic() {
    const row = await this.repo.findOne({ where: { key: CLINIC_KEY } });
    const value = row?.value ?? {};
    return {
      clinic: { ...DEFAULT_CLINIC_SETTINGS.clinic, ...(value.clinic ?? {}) },
      services: value.services ?? DEFAULT_CLINIC_SETTINGS.services,
      updated_at: row?.updated_at ?? null,
      updated_by: row?.updated_by ?? null,
    };
  }

  async saveClinic(dto: ClinicSettingsDto, currentUser?: string) {
    const names = dto.services.map((s) => s.name.trim());
    const dup = names.find((n, i) => names.indexOf(n) !== i);
    if (dup) throw new BadRequestException(`ชื่อบริการซ้ำ: ${dup}`);
    const value = {
      clinic: Object.fromEntries(Object.entries(dto.clinic).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])),
      services: dto.services.map((s) => ({ name: s.name.trim(), price: s.price ?? null, active: s.active })),
    };
    await this.repo.save({ key: CLINIC_KEY, value, updated_by: currentUser || 'system', updated_at: new Date() });
    return this.getClinic();
  }
}
