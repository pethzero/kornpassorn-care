// src/app/core/models/hospital-schedule.model.ts
export interface HospitalWeeklyHours {
  id?: number;
  day_of_week: number; // 0=อาทิตย์ .. 6=เสาร์
  is_closed: boolean;
  open_time?: string | null;
  close_time?: string | null;
  note?: string | null;
}

export interface HospitalSpecialDay {
  id?: number;
  date: string;
  is_closed: boolean;
  open_time?: string | null;
  close_time?: string | null;
  note?: string | null;
}

export interface HospitalScheduleResponse {
  weekly: HospitalWeeklyHours[];
  specialDays: HospitalSpecialDay[];
}
