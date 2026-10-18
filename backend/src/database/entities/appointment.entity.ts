import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Patient } from './medical.entity';

export const APPOINTMENT_STATUSES = ['scheduled', 'completed', 'cancelled', 'no_show'] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

// นัดหมายคนไข้ (แบบง่าย) — 1 แถว = 1 นัด
@Entity({ name: 'appointments' })
@Index(['appointment_date', 'start_time'])
export class Appointment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  patient_id: number;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ type: 'date' })
  appointment_date: string;

  // HH:mm
  @Column({ type: 'time' })
  start_time: string;

  @Column({ type: 'time', nullable: true })
  end_time?: string | null;

  // บริการที่นัด เช่น "ทำแผล", "ฉีดยา"
  @Column({ type: 'varchar', length: 100 })
  service: string;

  // scheduled = รอมา, completed = มาแล้ว, cancelled = ยกเลิก, no_show = ไม่มาตามนัด
  @Column({ type: 'varchar', length: 20, default: 'scheduled' })
  status: AppointmentStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note?: string | null;

  @Column({ length: 50, default: 'system' })
  create_by: string;

  @Column({ type: 'timestamp', default: () => 'now()' })
  create_date: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  modify_by?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  modify_date?: Date | null;
}
