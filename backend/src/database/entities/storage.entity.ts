import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

// หน้าตู้แต่ละช่อง — หน้า 3D ใช้ตัดสินใจว่าจะวาดบานกระจก/บานทึบ/ลิ้นชัก/ช่องโล่ง
//   glass  = บานกระจก (มองเห็นของข้างใน)   solid = บานทึบ (มักเป็นชั้นล่าง)
//   drawer = ลิ้นชัก (ดึงออก)              open  = ช่องโล่งไม่มีบาน
export const COMPARTMENT_FRONTS = ['glass', 'solid', 'drawer', 'open'] as const;
export type CompartmentFront = (typeof COMPARTMENT_FRONTS)[number];

// มุมหมุนตู้ในผังห้อง (องศา ตามเข็มนาฬิกาเมื่อมองจากบน) — 0 = หน้าตู้หันออกจากผนังด้านหลังห้อง
export const CABINET_ROTATIONS = [0, 90, 180, 270] as const;

// ห้อง/โซนเก็บของ — พื้นห้องเป็นสี่เหลี่ยม กว้าง (ซ้าย→ขวา) × ลึก (ผนังหลัง→หน้า) หน่วย ซม.
@Entity({ name: 'storage_rooms' })
export class StorageRoom {
  @PrimaryGeneratedColumn()
  id: number;

  // รหัสสั้น เช่น "A"
  @Column({ type: 'varchar', length: 20, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'int', default: 400 })
  width_cm: number;

  @Column({ type: 'int', default: 300 })
  depth_cm: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note?: string | null;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @OneToMany(() => StorageCabinet, (c) => c.room)
  cabinets: StorageCabinet[];

  @Column({ length: 50, default: 'system' })
  create_by: string;

  @Column({ type: 'timestamp', default: () => 'now()' })
  create_date: Date;

  @Column({ length: 50, nullable: true })
  modify_by?: string;

  @Column({ type: 'timestamp', nullable: true })
  modify_date?: Date;
}

// ตู้เก็บยา/เวชภัณฑ์ 1 ใบ — ขนาดเป็นเซนติเมตร (หน้า 3D ใช้ตามจริง 1 หน่วย = 1 ซม.)
@Entity({ name: 'storage_cabinets' })
export class StorageCabinet {
  @PrimaryGeneratedColumn()
  id: number;

  // รหัสสั้นที่ติดหน้าตู้จริง เช่น "C1"
  @Column({ type: 'varchar', length: 20, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  // ห้องที่ตั้งตู้ (ไม่ระบุ = ยังไม่ได้วางในห้องไหน) · ลบห้อง → ตู้กลับเป็นไม่ระบุห้อง
  @Column({ type: 'int', nullable: true })
  @Index()
  room_id?: number | null;

  @ManyToOne(() => StorageRoom, (r) => r.cabinets, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'room_id' })
  room?: StorageRoom | null;

  // จุดกึ่งกลางฐานตู้ในห้อง: x จากผนังซ้าย, z จากผนังหลัง (ซม.)
  @Column({ type: 'int', default: 0 })
  pos_x_cm: number;

  @Column({ type: 'int', default: 0 })
  pos_z_cm: number;

  @Column({ type: 'int', default: 0 })
  rotation: number;

  @Column({ type: 'int', default: 90 })
  width_cm: number;

  @Column({ type: 'int', default: 180 })
  height_cm: number;

  @Column({ type: 'int', default: 45 })
  depth_cm: number;

  // สีตัวตู้ (#rrggbb) — ค่าเริ่มต้นสีสเตนเลส
  @Column({ type: 'varchar', length: 7, default: '#d5dade' })
  color: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note?: string | null;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @OneToMany(() => StorageCompartment, (c) => c.cabinet, { cascade: true })
  compartments: StorageCompartment[];

  @Column({ length: 50, default: 'system' })
  create_by: string;

  @Column({ type: 'timestamp', default: () => 'now()' })
  create_date: Date;

  @Column({ length: 50, nullable: true })
  modify_by?: string;

  @Column({ type: 'timestamp', nullable: true })
  modify_date?: Date;
}

// ช่องในตู้ (ส่วนที่มีบาน/ลิ้นชักของตัวเอง) — ตำแหน่งวัดจากมุมล่างซ้ายด้านหน้าของตู้ (ซม.)
// ของในช่องแบ่งเป็น "ชั้น" (levels) — ชั้น 1 = บนสุด · ล็อตสินค้าอ้างถึงช่อง + ชั้น (inventory_product_lots.storage_*)
@Entity({ name: 'storage_compartments' })
@Index(['cabinet_id', 'code'], { unique: true })
export class StorageCompartment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  cabinet_id: number;

  @ManyToOne(() => StorageCabinet, (c) => c.compartments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cabinet_id' })
  cabinet: StorageCabinet;

  // รหัสในตู้ เช่น "A" (บน), "B" (ล่าง) → อ้างอิงเต็มเป็น "C1-A ชั้น 2"
  @Column({ type: 'varchar', length: 10 })
  code: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  name?: string | null;

  @Column({ type: 'int' })
  x_cm: number;

  @Column({ type: 'int' })
  y_cm: number;

  @Column({ type: 'int' })
  width_cm: number;

  @Column({ type: 'int' })
  height_cm: number;

  @Column({ type: 'varchar', length: 10, default: 'solid' })
  front: CompartmentFront;

  // จำนวนบาน (บานคู่ = 2) · ลิ้นชัก/ช่องโล่งไม่ใช้
  @Column({ type: 'int', default: 2 })
  door_count: number;

  // จำนวนชั้นวางของข้างใน (≥ 1)
  @Column({ type: 'int', default: 1 })
  levels: number;

  // มีกุญแจล็อก (ยาควบคุม ฯลฯ)
  @Column({ default: false })
  has_lock: boolean;

  @Column({ type: 'int', default: 0 })
  sort_order: number;
}
