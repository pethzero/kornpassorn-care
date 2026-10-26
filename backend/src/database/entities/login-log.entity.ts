import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';
import { Patient } from './medical.entity';

@Entity('login_logs')
export class LoginLog {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  // login log ของ patient (phone+OTP) — reuse ตารางเดียวกันแทนที่จะแยกตารางใหม่
  @ManyToOne(() => Patient, { nullable: true })
  @JoinColumn({ name: 'patient_id' })
  patient?: Patient;

  // ชื่อผู้ใช้/เบอร์ที่พิมพ์มา (ตัวเล็ก) — มีแม้ login ไม่สำเร็จ ใช้นับครั้งที่ผิดเพื่อพักการ login และให้ admin ดู
  @Column({ length: 100, nullable: true })
  @Index()
  username?: string;

  @CreateDateColumn()
  login_time: Date;

  @Column({ length: 45, nullable: true })
  ip_address: string;

  @Column({ type: 'text', nullable: true })
  user_agent: string;

  @Column({ default: false })
  success: boolean;

  @Column({ type: 'text', nullable: true })
  fail_reason: string;
}