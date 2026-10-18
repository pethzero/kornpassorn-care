import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Document } from './document.entity';

// บัญชีการเงิน (รายรับ/รายจ่าย) — มี 2 ที่มา:
//   1) ลงอัตโนมัติจากเอกสาร (document_id มีค่า) เช่น รับของเข้า → รายจ่าย, บริการคนไข้ → รายรับ
//      แก้/ลบที่นี่ไม่ได้ ต้องยกเลิกที่เอกสารแทน (ยกเลิกเอกสารแล้วรายการนี้จะถูกลบตาม)
//   2) บันทึกเองโดยตรง (document_id = null) เช่น ค่าไฟ ค่าเช่า เงินเดือน
@Entity('finance_records')
export class FinanceRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  item_name: string;

  @Column({ type: 'varchar', length: 20 })
  category: 'income' | 'expense';

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'date' })
  record_date: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({ type: 'int', nullable: true })
  @Index()
  document_id: number | null;

  @ManyToOne(() => Document, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'document_id' })
  document?: Document | null;

  // ผู้สร้างข้อมูล
  @Column({ 
    type: 'varchar', 
    length: 50, 
    nullable: true, // ชั่วคราวให้เป็น nullable เพื่อรองรับข้อมูลเดิม
    default: 'system' // ค่า default สำหรับข้อมูลเดิม
  })
  create_by: string;

  // วันที่สร้าง (วัน+เวลา)
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  create_date: Date;

  // ผู้แก้ไขล่าสุด
  @Column({ type: 'varchar', length: 50, nullable: true })
  modify_by: string | null;

  // วันที่แก้ไขล่าสุด
  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  modify_date: Date | null;
}
