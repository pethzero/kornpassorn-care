import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';

// สินค้า/ยา (master) — ตัวสินค้ากลางๆ ไม่ผูกยี่ห้อ/ล็อต เช่น "Paracetamol 500 mg"
// ยี่ห้อและขนาดบรรจุ (กล่องละ 40 / 50 เม็ด ฯลฯ) แยกไปอยู่ที่ InventoryProductPackage เพราะแต่ละเจ้าบรรจุไม่เท่ากัน
@Entity({ name: 'inventory_products' })
export class InventoryProduct {
  @PrimaryGeneratedColumn()
  id: number;

  // ไม่มี SKU ต้องเก็บเป็น null (ไม่ใช่ '') — unique constraint นับ '' ซ้ำกันได้ แต่ null หลายตัวไม่ชนกัน
  @Column({ type: 'varchar', length: 50, unique: true, nullable: true })
  sku?: string | null;

  @Column({ length: 255 })
  name: string;

  // 'medicine' | 'supply' | 'other'
  @Column({ length: 30, default: 'other' })
  category: string;

  // ชื่อสามัญทางยา เช่น "Paracetamol" — ใช้ค้นหา/จัดกลุ่ม (ไม่บังคับ สำหรับเวชภัณฑ์ทั่วไป)
  @Column({ length: 150, nullable: true })
  generic_name?: string;

  // ความแรง เช่น "500 mg", "10 mg/5 ml"
  @Column({ length: 50, nullable: true })
  strength?: string;

  // รูปแบบยา เช่น "tablet" (เม็ด), "capsule", "syrup", "injection", "cream"
  @Column({ length: 30, nullable: true })
  dosage_form?: string;

  // หน่วยนับที่ใช้ตัดสต็อก/จ่ายจริง เช่น เม็ด, ขวด (ทุกอย่างในระบบ — quantity_in/quantity_remaining — เก็บเป็นหน่วยนี้เสมอ)
  @Column({ length: 30, nullable: true })
  unit?: string;

  // ราคาขายต่อ unit (ค่าเริ่มต้นตอนออกบิล แก้ได้ในเอกสาร)
  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  sell_price?: number;

  // จุดสั่งซื้อ — คงเหลือรวมทุกล็อต (หน่วย unit) ต่ำกว่าค่านี้ให้แจ้งเตือน
  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  reorder_level?: number;

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

  @OneToMany(() => InventoryProductPackage, (pkg) => pkg.product)
  packages: InventoryProductPackage[];
}

// ยี่ห้อ + ขนาดบรรจุที่ซื้อเข้า ของสินค้า 1 ตัว (1 สินค้า มีได้หลายแบบ)
// เช่น Paracetamol 500 mg → [ยี่ห้อ A: กล่อง = 40 เม็ด], [ยี่ห้อ B: กล่อง = 50 เม็ด], [ยี่ห้อ B: แผง = 10 เม็ด]
@Entity({ name: 'inventory_product_packages' })
@Index(['product_id', 'brand', 'pack_unit', 'pack_size'], { unique: true })
export class InventoryProductPackage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  product_id: number;

  @ManyToOne(() => InventoryProduct, (product) => product.packages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: InventoryProduct;

  // ยี่ห้อ/ผู้ผลิต เช่น "Sara (Thai Nakorn Patana)"
  @Column({ length: 100 })
  brand: string;

  // หน่วยที่ซื้อเข้า เช่น "กล่อง", "แผง", "ขวด"
  @Column({ length: 30 })
  pack_unit: string;

  // จำนวน product.unit ต่อ 1 pack_unit เช่น 1 กล่อง = 40 เม็ด → 40
  @Column({ type: 'int' })
  pack_size: number;

  @Column({ length: 50, nullable: true })
  barcode?: string;

  // ลักษณะของแบบนี้ เช่น "เม็ดสีขาว เคลือบฟิล์ม", "แผงฟอยล์สีเงิน" — ช่วยแยกยี่ห้อตอนรับของ
  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null;

  // หมายเหตุภายใน เช่น "สั่งจากร้าน A", "ราคาขึ้นช่วงปลายปี"
  @Column({ type: 'varchar', length: 255, nullable: true })
  note?: string | null;

  // ราคาทุนล่าสุดต่อ 1 pack_unit (ใช้เติมค่าเริ่มต้นตอนรับเข้า)
  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  last_pack_cost?: number;

  // แบบที่ซื้อประจำ — ใช้เลือกให้อัตโนมัติตอนรับเข้า
  @Column({ default: false })
  is_default: boolean;

  // ปิดแทนการลบ เมื่อมีล็อตอ้างอิงแล้ว
  @Column({ default: true })
  is_active: boolean;

  @Column({ length: 50, default: 'system' })
  create_by: string;

  @Column({ type: 'timestamp', default: () => 'now()' })
  create_date: Date;

  @Column({ length: 50, nullable: true })
  modify_by?: string;

  @Column({ type: 'timestamp', nullable: true })
  modify_date?: Date;
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

  // แบบบรรจุ/ยี่ห้อที่รับเข้าล็อตนี้ (ไม่บังคับ — ล็อตที่รับเป็นหน่วยย่อยตรงๆ ไม่ต้องมี)
  @Column({ type: 'int', nullable: true })
  package_id?: number | null;

  @ManyToOne(() => InventoryProductPackage, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'package_id' })
  package?: InventoryProductPackage | null;

  // snapshot ของ package ตอนรับเข้า — ถ้าภายหลังแก้ขนาดบรรจุที่ package ประวัติล็อตเดิมจะไม่เพี้ยน
  @Column({ type: 'varchar', length: 30, nullable: true })
  pack_unit?: string | null;

  @Column({ type: 'int', nullable: true })
  pack_size?: number | null;

  // จำนวนรับเข้าตอนแรก หน่วยเดียวกับ product.unit เสมอ (ไม่เปลี่ยนแปลงหลังบันทึก ใช้เทียบ audit)
  // ถ้ารับเข้าเป็น pack_unit (เช่นซื้อเป็นกล่อง) ค่านี้คือผลคูณแล้ว (received_pack_qty * pack_size)
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
  // ถ้าเลือก package จะ copy มาจาก package.brand อัตโนมัติ
  @Column({ type: 'varchar', length: 100, nullable: true })
  brand?: string | null;

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

  // id ของ DocumentItem ที่ทำให้เกิดการเคลื่อนไหวนี้ (null = ตั้งยอดยกมา/แก้ไขจากหน้าล็อต)
  // เก็บแบบ loose reference ไม่ทำ relation เพื่อเลี่ยง circular import (document.entity import inventory.entity อยู่แล้ว)
  @Column({ type: 'int', nullable: true })
  @Index()
  document_item_id?: number | null;

  @Column({ type: 'timestamp', default: () => 'now()' })
  moved_date: Date;

  @Column({ length: 255, nullable: true })
  note?: string;
}
