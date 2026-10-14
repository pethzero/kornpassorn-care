import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
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