import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

// วันทำการประจำสัปดาห์ — หนึ่งแถวต่อ day_of_week (0=อาทิตย์ .. 6=เสาร์)
@Entity({ name: 'hospital_weekly_hours' })
export class HospitalWeeklyHours {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'day_of_week', type: 'smallint' })
  @Index({ unique: true })
  day_of_week: number;

  @Column({ name: 'is_closed', default: false })
  is_closed: boolean;

  @Column({ name: 'open_time', type: 'time', nullable: true })
  open_time?: string;

  @Column({ name: 'close_time', type: 'time', nullable: true })
  close_time?: string;

  @Column({ length: 255, nullable: true })
  note?: string;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updated_at: Date;
}

// วันหยุด/วันพิเศษที่ override ตารางประจำสัปดาห์ (เช่น วันหยุดนักขัตฤกษ์)
@Entity({ name: 'hospital_special_days' })
export class HospitalSpecialDay {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  @Index({ unique: true })
  date: string;

  @Column({ name: 'is_closed', default: true })
  is_closed: boolean;

  @Column({ name: 'open_time', type: 'time', nullable: true })
  open_time?: string;

  @Column({ name: 'close_time', type: 'time', nullable: true })
  close_time?: string;

  @Column({ length: 255, nullable: true })
  note?: string;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  created_at: Date;
}
