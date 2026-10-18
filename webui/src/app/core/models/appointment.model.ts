// src/app/core/models/appointment.model.ts
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export const APPOINTMENT_STATUS_INFO: Record<AppointmentStatus, { label: string; chip: string }> = {
  scheduled: { label: 'รอมา', chip: 'chip-info' },
  completed: { label: 'มาแล้ว', chip: 'chip-accent' },
  cancelled: { label: 'ยกเลิก', chip: 'chip-plain' },
  no_show: { label: 'ไม่มาตามนัด', chip: 'chip-warn' },
};

export interface Appointment {
  id: number;
  patient_id: number;
  patient?: { id: number; patient_code: string; first_name: string; last_name: string; phone?: string };
  appointment_date: string;
  start_time: string;
  end_time?: string | null;
  service: string;
  status: AppointmentStatus;
  note?: string | null;
  create_by?: string;
}

export interface AppointmentPayload {
  patient_id: number;
  appointment_date: string;
  start_time: string;
  end_time?: string | null;
  service: string;
  status?: AppointmentStatus;
  note?: string | null;
}

export interface AppointmentQuery {
  date_from?: string;
  date_to?: string;
  status?: AppointmentStatus;
  patient_id?: number;
  search?: string;
}
