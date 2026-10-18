import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

// สิทธิ์ที่ให้ระบบภายนอกได้ — เพิ่ม scope ใหม่ที่นี่ แล้วใช้ @ApiScopes('...') ที่ endpoint
export const API_SCOPES = {
  'appointments:read': 'ดูนัดหมาย (ไม่รวมเบอร์โทร/เลขบัตรคนไข้)',
  'clinic:read': 'ดูเวลาทำการและวันหยุดของคลินิก',
} as const;
export type ApiScope = keyof typeof API_SCOPES;

// ระบบภายนอกที่ได้รับอนุญาตให้เรียก API (/api/v1/*) — แยกจากตาราง users ของคน
// ยืนยันตัวด้วย client_id + client_secret แลก access token (OAuth2 client credentials)
@Entity({ name: 'api_clients' })
export class ApiClient {
  @PrimaryGeneratedColumn()
  id: number;

  // ชื่อที่อ่านเข้าใจ เช่น "ระบบนัดหมายร้านยา ABC"
  @Column({ type: 'varchar', length: 150 })
  name: string;

  // ไอดีสาธารณะ (ส่งให้ผู้เชื่อมต่อ) เช่น kpc_3f9a1c7e2b4d6f80
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 40 })
  client_id: string;

  // secret เก็บแบบ bcrypt hash เท่านั้น — ตัวจริงแสดงครั้งเดียวตอนสร้าง/สร้างใหม่
  @Column({ type: 'varchar' })
  secret_hash: string;

  // 4 ตัวท้ายของ secret ไว้ช่วยจำว่าตัวไหน (ไม่พอสำหรับเดา)
  @Column({ type: 'varchar', length: 8 })
  secret_hint: string;

  @Column({ type: 'simple-array' })
  scopes: string[];

  @Column({ default: true })
  is_active: boolean;

  // หมดอายุเมื่อไหร่ (null = ไม่หมด)
  @Column({ type: 'timestamp', nullable: true })
  expires_at?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  last_used_at?: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note?: string | null;

  @Column({ length: 50, default: 'system' })
  create_by: string;

  @Column({ type: 'timestamp', default: () => 'now()' })
  create_date: Date;
}
