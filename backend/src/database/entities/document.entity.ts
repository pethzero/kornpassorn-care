import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { InventoryProduct, InventoryProductLot, InventoryProductPackage } from './inventory.entity';
import { Patient } from './medical.entity';

// ประเภทเอกสาร — แต่ละประเภทกำหนดทิศทางสต็อก และว่าจะลงบัญชีการเงิน (finance_records) อย่างไร
//   receive          รับของเข้า (RCV)   สต็อกเข้า   → ลงบัญชีเป็นรายจ่าย (ค่าของ)
//   issue            เบิก/หักสต็อก (ISS) สต็อกออก   → ไม่มีเงิน ไม่ลงบัญชี (ใช้ภายใน)
//   patient_service  บริการคนไข้ (SRV)  สต็อกออก   → ลงบัญชีเป็นรายรับ (ค่าบริการ + ค่ายา/เวชภัณฑ์)
//   adjust           ปรับยอดสต็อก (ADJ) เข้า/ออกรายบรรทัด → ไม่ลงบัญชี (หมดอายุ/ชำรุด/นับสต็อก)
export const DOCUMENT_TYPES = ['receive', 'issue', 'patient_service', 'adjust'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_PREFIX: Record<DocumentType, string> = {
  receive: 'RCV',
  issue: 'ISS',
  patient_service: 'SRV',
  adjust: 'ADJ',
};

// เลขรันเอกสารแยกตามประเภท + ปี เช่น RCV-2026-0001 (อัปเดตแบบ atomic ด้วย upsert ใน service)
@Entity({ name: 'document_sequences' })
@Index(['doc_prefix', 'doc_year'], { unique: true })
export class DocumentSequence {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 5 })
  doc_prefix: string;

  @Column()
  doc_year: number;

  @Column({ default: 0 })
  last_number: number;
}

// หัวเอกสาร 1 ใบ
@Entity({ name: 'documents' })
export class Document {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 30, unique: true })
  doc_no: string;

  @Column({ type: 'varchar', length: 20 })
  @Index()
  doc_type: DocumentType;

  @Column({ type: 'date' })
  @Index()
  doc_date: string;

  // 'confirmed' | 'void'
  @Column({ length: 20, default: 'confirmed' })
  status: string;

  // ยอดเงินรวมของเอกสาร (receive = ค่าของ, patient_service = ค่าบริการ) — issue/adjust เป็น 0
  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  total_amount: number;

  // ผู้ขาย/ร้านที่ซื้อ (receive)
  @Column({ type: 'varchar', length: 150, nullable: true })
  supplier?: string | null;

  // เหตุผล (issue/adjust) เช่น "ใช้ภายในคลินิก", "หมดอายุ", "ชำรุด", "นับสต็อก"
  @Column({ type: 'varchar', length: 150, nullable: true })
  reason?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note?: string | null;

  // บังคับเมื่อ doc_type = patient_service
  @Column({ type: 'int', nullable: true })
  patient_id?: number | null;

  @ManyToOne(() => Patient, { nullable: true })
  @JoinColumn({ name: 'patient_id' })
  patient?: Patient | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  void_reason?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  void_by?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  void_date?: Date | null;

  @Column({ length: 50, default: 'system' })
  create_by: string;

  @Column({ type: 'timestamp', default: () => 'now()' })
  create_date: Date;

  @OneToMany(() => DocumentItem, (item) => item.document)
  items: DocumentItem[];
}

// รายการในเอกสาร
@Entity({ name: 'document_items' })
export class DocumentItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  document_id: number;

  @ManyToOne(() => Document, (doc) => doc.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @Column()
  line_no: number;

  // 'product' (กระทบสต็อก) | 'service' (ค่าบริการ) | 'other'
  @Column({ length: 20, default: 'product' })
  item_type: string;

  // ทิศทางสต็อกของบรรทัดสินค้า: 'in' | 'out' (service/other = null)
  @Column({ type: 'varchar', length: 5, nullable: true })
  direction?: 'in' | 'out' | null;

  // ชื่อบริการ เช่น "ล้างแผล" (item_type = service)
  @Column({ type: 'varchar', length: 100, nullable: true })
  category?: string | null;

  @Column({ type: 'int', nullable: true })
  product_id?: number | null;

  @ManyToOne(() => InventoryProduct, { nullable: true })
  @JoinColumn({ name: 'product_id' })
  product?: InventoryProduct | null;

  // ล็อตที่ถูกตัด/รับเข้า — FEFO ข้ามหลายล็อตจะเก็บล็อตแรกไว้ที่นี่ รายละเอียดครบอยู่ใน inventory_stock_movements
  @Column({ type: 'int', nullable: true })
  product_lot_id?: number | null;

  @ManyToOne(() => InventoryProductLot, { nullable: true })
  @JoinColumn({ name: 'product_lot_id' })
  product_lot?: InventoryProductLot | null;

  // ยี่ห้อ/ขนาดบรรจุที่รับเข้า (receive)
  @Column({ type: 'int', nullable: true })
  package_id?: number | null;

  @ManyToOne(() => InventoryProductPackage, { nullable: true })
  @JoinColumn({ name: 'package_id' })
  package?: InventoryProductPackage | null;

  // จำนวนตามหน่วยบรรจุที่กรอก (เช่น 3 กล่อง) — quantity คือผลคูณเป็น product.unit แล้ว
  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  pack_qty?: number | null;

  // จำนวนหน่วยย่อย (product.unit) ที่เข้า/ออกจริง
  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  quantity?: number | null;

  // ราคาต่อหน่วยที่กรอก (ต่อแพ็คถ้ามี pack_qty, ไม่งั้นต่อหน่วยย่อย)
  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  unit_price?: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  amount: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description?: string | null;
}
