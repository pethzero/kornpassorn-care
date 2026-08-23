import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

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
