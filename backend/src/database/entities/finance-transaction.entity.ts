import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { InventoryProduct, InventoryProductLot } from './inventory.entity';
import { Patient } from './medical.entity';

// ตัวช่วยรันเลขที่เอกสารแยกตามปี (reset ทุกปี) — อัปเดตแบบ atomic ด้วย raw SQL upsert ใน service
@Entity({ name: 'finance_doc_sequences' })
export class FinanceDocSequence {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  doc_year: number;

  @Column({ default: 0 })
  last_number: number;
}

// หัวเอกสาร (ใบรับ/จ่ายเงิน) — รายการซื้อขายสินค้า หรือรายรับ/จ่ายทั่วไป 1 ใบ มีได้หลายรายการย่อย
@Entity({ name: 'finance_transactions' })
export class FinanceTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  // เลขที่เอกสาร เช่น "FN2026-00001" แสดงผลเป็น No.001
  @Column({ length: 30, unique: true })
  doc_no: string;

  // 'sale' | 'purchase' | 'patient_service' | 'income' | 'expense' | 'mixed'
  @Column({ length: 20 })
  doc_type: string;

  @Column({ type: 'date' })
  doc_date: string;

  // 'draft' | 'confirmed' | 'void'
  @Column({ length: 20, default: 'confirmed' })
  status: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  total_in: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  total_out: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  net_amount: number;

  @Column({ length: 500, nullable: true })
  note?: string;

  // ระบุเมื่อ doc_type = 'patient_service' เพื่อโยงเอกสารนี้กลับไปหาคนไข้ที่ถูกเรียกเก็บเงิน
  @Column({ nullable: true })
  patient_id?: number;

  @ManyToOne(() => Patient, { nullable: true })
  @JoinColumn({ name: 'patient_id' })
  patient?: Patient;

  @Column({ length: 50, default: 'system' })
  create_by: string;

  @Column({ type: 'timestamp', default: () => 'now()' })
  create_date: Date;

  @Column({ length: 50, nullable: true })
  modify_by?: string;

  @Column({ type: 'timestamp', nullable: true, default: () => 'now()' })
  modify_date?: Date;

  @OneToMany(() => FinanceTransactionItem, (item) => item.transaction)
  items: FinanceTransactionItem[];
}

// รายการย่อยในเอกสาร — แต่ละบรรทัดเป็นเงินรับหรือเงินจ่ายก็ได้ภายในเอกสารเดียวกัน
@Entity({ name: 'finance_transaction_items' })
export class FinanceTransactionItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  transaction_id: number;

  @ManyToOne(() => FinanceTransaction, (t) => t.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transaction_id' })
  transaction: FinanceTransaction;

  @Column()
  line_no: number;

  // 'in' (เงินรับ) | 'out' (เงินจ่าย)
  @Column({ length: 5 })
  direction: 'in' | 'out';

  // หมวดย่อยแบบ free text เช่น 'product_sale', 'service_fee', 'medicine_purchase', 'salary'
  @Column({ length: 50, nullable: true })
  category?: string;

  // 'product' | 'service' | 'other'
  @Column({ length: 20, default: 'other' })
  item_type: string;

  @Column({ nullable: true })
  product_id?: number;

  @ManyToOne(() => InventoryProduct, { nullable: true })
  @JoinColumn({ name: 'product_id' })
  product?: InventoryProduct;

  @Column({ nullable: true })
  product_lot_id?: number;

  @ManyToOne(() => InventoryProductLot, { nullable: true })
  @JoinColumn({ name: 'product_lot_id' })
  product_lot?: InventoryProductLot;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  quantity?: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  unit_price?: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: number;

  @Column({ length: 500, nullable: true })
  description?: string;

  // ช่องเชื่อมโยงแบบ loose ไปยัง record อื่นในอนาคต เช่น ใบจ่ายยาคนไข้
  // ('patient_dispensing', ref_id = id ของใบจ่ายยา) — ยังไม่ทำ FK ตรงเพราะ entity ปลายทางยังไม่ถูกสร้าง
  @Column({ length: 50, nullable: true })
  ref_type?: string;

  @Column({ nullable: true })
  ref_id?: number;

  @Column({ type: 'timestamp', default: () => 'now()' })
  create_date: Date;
}
