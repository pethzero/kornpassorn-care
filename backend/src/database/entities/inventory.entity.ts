import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';

// สินค้า/ยา (master) — ตัวสินค้ากลางๆ ไม่ผูกกับล็อตใดล็อตหนึ่ง
@Entity({ name: 'inventory_products' })
export class InventoryProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true, nullable: true })
  sku?: string;

  @Column({ length: 255 })
  name: string;

  // 'medicine' | 'supply' | 'other'
  @Column({ length: 30, default: 'other' })
  category: string;

  // หน่วยนับที่ใช้ตัดสต็อก/จ่ายจริง เช่น เม็ด, ขวด (ทุกอย่างในระบบ — quantity_in/quantity_remaining — เก็บเป็นหน่วยนี้เสมอ)
  @Column({ length: 30, nullable: true })
  unit?: string;

  // หน่วยที่ซื้อเข้า ถ้าต่างจาก unit เช่น "กล่อง" (ไม่บังคับ — สินค้าที่ซื้อเป็นหน่วยเดียวกับ unit ก็ไม่ต้องตั้ง)
  @Column({ length: 30, nullable: true })
  pack_unit?: string;

  // จำนวน unit ต่อ 1 pack_unit เช่น 1 กล่อง = 30 เม็ด → pack_size = 30 (ต้องตั้งคู่กับ pack_unit เสมอ)
  @Column({ type: 'int', nullable: true })
  pack_size?: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ length: 50, default: 'system' })
  create_by: string;

  @Column({ type: 'timestamp', default: () => 'now()' })
  create_date: Date;

  @Column({ length: 50, nullable: true })
  modify_by?: string;

  @Column({ type: 'timestamp', nullable: true, default: () => 'now()' })
  modify_date?: Date;

  @OneToMany(() => InventoryProductLot, (lot) => lot.product)
  lots: InventoryProductLot[];
}

// ล็อตของสินค้า — รองรับสินค้าที่มีอายุ/ล็อตการผลิต เช่น ยา
@Entity({ name: 'inventory_product_lots' })
@Index(['product_id', 'lot_no'], { unique: true })
export class InventoryProductLot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  product_id: number;

  @ManyToOne(() => InventoryProduct, (product) => product.lots, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: InventoryProduct;

  @Column({ length: 50 })
  lot_no: string;

  @Column({ type: 'date', nullable: true })
  manufacture_date?: string;

  // ใช้คำนวณ "ใกล้หมดอายุ" / เรียง FEFO (First Expired, First Out)
  @Column({ type: 'date', nullable: true })
  @Index()
  expiry_date?: string;

  // จำนวนรับเข้าตอนแรก หน่วยเดียวกับ product.unit เสมอ (ไม่เปลี่ยนแปลงหลังบันทึก ใช้เทียบ audit)
  // ถ้ารับเข้าเป็น pack_unit (เช่นซื้อเป็นกล่อง) ค่านี้คือผลคูณแล้ว (received_pack_qty * product.pack_size)
  @Column({ type: 'numeric', precision: 12, scale: 2 })
  quantity_in: number;

  // จำนวนที่รับเข้าจริงตามหน่วยซื้อ (pack_unit) ถ้ารับเข้าเป็น pack — เก็บไว้เพื่อแสดงผล/ตรวจสอบย้อนหลังเท่านั้น
  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  received_pack_qty?: number | null;

  // คงเหลือจริง — ถูกตัดลงทุกครั้งที่ขาย/จ่ายยาออกจากล็อตนี้
  @Column({ type: 'numeric', precision: 12, scale: 2 })
  quantity_remaining: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  unit_cost?: number;

  @Column({ length: 100, nullable: true })
  supplier?: string;

  // เจ้าของยี่ห้อ/ผู้ผลิต (ต่างจาก supplier ซึ่งเป็นร้าน/คนที่ซื้อมาด้วย) เช่น "Berlin Pharmaceutical"
  @Column({ length: 100, nullable: true })
  brand?: string;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  received_date: string;

  @Column({ length: 255, nullable: true })
  note?: string;

  @Column({ length: 50, default: 'system' })
  create_by: string;

  @Column({ type: 'timestamp', default: () => 'now()' })
  create_date: Date;

  @Column({ length: 50, nullable: true })
  modify_by?: string;

  @Column({ type: 'timestamp', nullable: true })
  modify_date?: Date;
}

// ประวัติเข้า-ออกของล็อต (audit trail การตัด/เติมสต็อกทุกครั้ง)
@Entity({ name: 'inventory_stock_movements' })
export class InventoryStockMovement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  product_lot_id: number;

  @ManyToOne(() => InventoryProductLot, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_lot_id' })
  product_lot: InventoryProductLot;

  // 'in' | 'out' | 'adjust'
  @Column({ length: 10 })
  movement_type: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  quantity: number;

  // เก็บแค่ id แบบ loose reference ไปยัง FinanceTransactionItem ที่ทำให้เกิดการตัด/เติมสต็อกนี้
  // (ไม่ทำ relation ตรงเพื่อเลี่ยง circular import ระหว่าง inventory.entity.ts <-> finance-transaction.entity.ts)
  @Column({ nullable: true })
  finance_transaction_item_id?: number;

  @Column({ type: 'timestamp', default: () => 'now()' })
  moved_date: Date;

  @Column({ length: 255, nullable: true })
  note?: string;
}
