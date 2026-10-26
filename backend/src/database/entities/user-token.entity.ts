import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { User } from './user.entity';
import { Patient } from './medical.entity';

@Entity('user_tokens')
export class UserToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: true })
  @Index()
  user?: User;

  // sessions ของ patient (phone+OTP login) ใช้ relation นี้แทน user เพื่อ reuse ตาราง/cleanup cron เดียวกัน
  @ManyToOne(() => Patient, { nullable: true })
  @Index()
  patient?: Patient;

  // หา token ด้วย jti (อยู่ใน JWT ที่ลายเซ็นถูกต้องแล้ว) — ไม่ต้องเก็บ hash ของ token อีก
  // unique กัน jti ชนกัน (จริง ๆ แทบเป็นไปไม่ได้เพราะเป็น uuid v4 แต่กันไว้เผื่อบั๊กใน caller ที่ generate ซ้ำ)
  @Column({ type: 'uuid', nullable: true })
  @Index({ unique: true })
  jti?: string;

  @Column({ name: 'token_type', default: 'access' })
  tokenType?: string;

  // access + refresh ที่ออกคู่กัน (= 1 อุปกรณ์) มีค่าเดียวกัน = jti ของ refresh — ใช้ในหน้า "อุปกรณ์ที่เข้าสู่ระบบ"
  // null = token รุ่นก่อนมีคอลัมน์นี้
  @Column({ name: 'session_id', type: 'uuid', nullable: true })
  @Index()
  sessionId?: string | null;

  @Column({ name: 'device_info', type: 'jsonb', nullable: true })
  deviceInfo?: any;

  @Column({ name: 'device_ip', type: 'inet', nullable: true })
  deviceIp?: string;


  @Column({ name: 'revoked_by', type: 'uuid', nullable: true })
  revokedBy?: string;

  @Column({ name: 'revoked_at', type: 'timestamp', nullable: true })
  revokedAt?: Date;

  @Column({ name: 'revoked_reason', type: 'text', nullable: true })
  revokedReason?: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  // index ไว้ให้ cleanup job filter ตาม expired_at ได้เร็ว ไม่ต้อง full scan ตารางที่โตขึ้นเรื่อย ๆ
  @Column({ name: 'expired_at', type: 'timestamp', nullable: true })
  @Index()
  expired_at?: Date;

  @Column({ name: 'last_used', type: 'timestamp', nullable: true })
  last_used?: Date;

  @Column({ default: false })
  @Index()
  revoked: boolean;
}