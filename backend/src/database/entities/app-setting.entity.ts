import { Column, Entity, PrimaryColumn } from 'typeorm';

// การตั้งค่าระบบแบบ key → JSON (เช่น key 'clinic' = ข้อมูลคลินิก + รายการบริการ)
// เพิ่มการตั้งค่าใหม่ได้โดยไม่ต้องเพิ่มตาราง
@Entity({ name: 'app_settings' })
export class AppSetting {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  key: string;

  @Column({ type: 'jsonb' })
  value: any;

  @Column({ type: 'varchar', length: 50, nullable: true })
  updated_by?: string | null;

  @Column({ type: 'timestamp', default: () => 'now()' })
  updated_at: Date;
}
