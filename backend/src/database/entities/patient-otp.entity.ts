import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('patient_otps')
export class PatientOtp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20 })
  @Index()
  phone: string;

  @Column({ name: 'otp_hash' })
  otp_hash: string;

  @Column({ default: 0 })
  attempts: number;

  @Column({ name: 'consumed_at', type: 'timestamp', nullable: true })
  consumed_at?: Date;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expires_at: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
