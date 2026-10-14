import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { HospitalSpecialDay, HospitalWeeklyHours } from '../../database/entities/hospital-schedule.entity';
import { WeeklyHoursDayDto } from './dto/save-weekly-hours.dto';
import { CreateSpecialDayDto } from './dto/create-special-day.dto';

const DEFAULT_WEEKLY_HOURS = [
  { day_of_week: 0, is_closed: true, open_time: null, close_time: null }, // อาทิตย์
  { day_of_week: 1, is_closed: false, open_time: '08:00', close_time: '16:00' },
  { day_of_week: 2, is_closed: false, open_time: '08:00', close_time: '16:00' },
  { day_of_week: 3, is_closed: false, open_time: '08:00', close_time: '16:00' },
  { day_of_week: 4, is_closed: false, open_time: '08:00', close_time: '16:00' },
  { day_of_week: 5, is_closed: false, open_time: '08:00', close_time: '16:00' },
  { day_of_week: 6, is_closed: true, open_time: null, close_time: null }, // เสาร์
];

@Injectable()
export class HospitalScheduleService implements OnModuleInit {
  constructor(
    @InjectRepository(HospitalWeeklyHours) private readonly weeklyRepo: Repository<HospitalWeeklyHours>,
    @InjectRepository(HospitalSpecialDay) private readonly specialRepo: Repository<HospitalSpecialDay>,
  ) {}

  // ให้หน้า public ไม่ว่างเปล่าตั้งแต่ครั้งแรกที่รันระบบ
  async onModuleInit() {
    const count = await this.weeklyRepo.count();
    if (count === 0) {
      await this.weeklyRepo.save(this.weeklyRepo.create(DEFAULT_WEEKLY_HOURS as any));
    }
  }

  async getPublicSchedule() {
    const weekly = await this.weeklyRepo.find({ order: { day_of_week: 'ASC' } });
    const specialDays = await this.specialRepo
      .createQueryBuilder('d')
      .where('d.date >= CURRENT_DATE')
      .orderBy('d.date', 'ASC')
      .limit(30)
      .getMany();

    return { weekly, specialDays };
  }

  async saveWeekly(days: WeeklyHoursDayDto[]) {
    for (const day of days) {
      await this.weeklyRepo.upsert({ ...day, updated_at: new Date() } as any, ['day_of_week']);
    }
    return this.weeklyRepo.find({ order: { day_of_week: 'ASC' } });
  }

  addSpecialDay(dto: CreateSpecialDayDto) {
    return this.specialRepo.save(this.specialRepo.create(dto as any));
  }

  removeSpecialDay(id: number) {
    return this.specialRepo.delete(id);
  }
}
