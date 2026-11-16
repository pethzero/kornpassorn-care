// ตู้เก็บยา/เวชภัณฑ์ — ตรงกับ backend storage.entity.ts (ขนาดเป็นเซนติเมตร)

export type CompartmentFront = 'glass' | 'solid' | 'drawer' | 'open';

export const FRONT_LABEL: Record<CompartmentFront, string> = {
  glass: 'บานกระจก',
  solid: 'บานทึบ',
  drawer: 'ลิ้นชัก',
  open: 'ช่องโล่ง',
};

export interface StorageCompartment {
  id?: number;
  code: string;
  name?: string | null;
  // ตำแหน่งจากมุมล่างซ้ายด้านหน้าของตู้
  x_cm: number;
  y_cm: number;
  width_cm: number;
  height_cm: number;
  front: CompartmentFront;
  door_count: number;
  // ชั้นวางของข้างใน · ชั้น 1 = บนสุด
  levels: number;
  has_lock: boolean;
  lot_count?: number;
  expired_count?: number;
  expiring_count?: number;
}

// มุมหมุนตู้ในผังห้อง (ตามเข็มนาฬิกาเมื่อมองจากบน) · 0 = หน้าตู้หันออกจากผนังหลังห้อง
export type CabinetRotation = 0 | 90 | 180 | 270;

export interface StorageCabinet {
  id: number;
  code: string;
  name: string;
  room_id?: number | null;
  room?: Pick<StorageRoom, 'id' | 'code' | 'name'> | null;
  // จุดกึ่งกลางฐานตู้: x จากผนังซ้าย, z จากผนังหลัง (ซม.)
  pos_x_cm: number;
  pos_z_cm: number;
  rotation: CabinetRotation;
  width_cm: number;
  height_cm: number;
  depth_cm: number;
  color: string;
  note?: string | null;
  is_active: boolean;
  compartments: StorageCompartment[];
  lot_count?: number;
  // ล็อตที่หมดอายุแล้ว / ใกล้หมดอายุ (≤ 90 วัน) — มาจาก GET /storage/cabinets
  expired_count?: number;
  expiring_count?: number;
}

// ล็อตที่อยู่ในตู้ (หรือยังไม่ระบุที่เก็บ)
export interface CabinetLot {
  id: number;
  lot_no: string;
  product_id: number;
  product_name: string;
  brand?: string | null;
  unit: string;
  quantity_remaining: number;
  expiry_date?: string | null;
  storage_compartment_id: number | null;
  storage_level: number | null;
}

export interface StorageCabinetDetail extends StorageCabinet {
  lots: CabinetLot[];
}

export type CabinetPayload = Omit<StorageCabinet, 'id' | 'is_active' | 'lot_count' | 'expired_count' | 'expiring_count' | 'room' | 'pos_x_cm' | 'pos_z_cm' | 'rotation'> & {
  is_active?: boolean;
  pos_x_cm?: number;
  pos_z_cm?: number;
  rotation?: CabinetRotation;
};

// ห้อง/โซนเก็บของ — พื้นสี่เหลี่ยม กว้าง (ซ้าย→ขวา) × ลึก (ผนังหลัง→หน้า)
export interface StorageRoom {
  id: number;
  code: string;
  name: string;
  width_cm: number;
  depth_cm: number;
  note?: string | null;
  cabinet_count?: number;
  lot_count?: number;
  expired_count?: number;
  expiring_count?: number;
}

export interface StorageRoomDetail extends StorageRoom {
  cabinets: StorageCabinetDetail[];
}

export interface RoomList {
  rooms: StorageRoom[];
  unassigned: StorageCabinet[];
}

export type RoomPayload = Pick<StorageRoom, 'code' | 'name' | 'width_cm' | 'depth_cm' | 'note'>;

export interface Placement {
  cabinet_id: number;
  pos_x_cm: number;
  pos_z_cm: number;
  rotation: CabinetRotation;
}

// รอยตู้บนพื้นห้อง (ซม. จากผนังซ้าย/หลัง) — หมุน 90/270 แล้วกว้างกับลึกสลับกัน
export function footprint(c: Pick<StorageCabinet, 'width_cm' | 'depth_cm' | 'pos_x_cm' | 'pos_z_cm' | 'rotation'>) {
  const turned = c.rotation % 180 !== 0;
  const w = turned ? c.depth_cm : c.width_cm;
  const d = turned ? c.width_cm : c.depth_cm;
  return { x0: c.pos_x_cm - w / 2, x1: c.pos_x_cm + w / 2, z0: c.pos_z_cm - d / 2, z1: c.pos_z_cm + d / 2, w, d };
}

// แบบตู้สำเร็จรูป — เลือกแล้วแก้ต่อได้
export interface CabinetPreset {
  key: string;
  label: string;
  width_cm: number;
  height_cm: number;
  depth_cm: number;
  compartments: StorageCompartment[];
}

const c = (
  code: string, name: string, x: number, y: number, w: number, h: number,
  front: CompartmentFront, levels = 1, door_count = 2, has_lock = false,
): StorageCompartment => ({ code, name, x_cm: x, y_cm: y, width_cm: w, height_cm: h, front, levels, door_count, has_lock });

export const CABINET_PRESETS: CabinetPreset[] = [
  {
    key: 'small',
    label: 'ตู้เล็ก — กระจกบน + บานทึบล่าง',
    width_cm: 60, height_cm: 120, depth_cm: 40,
    compartments: [
      c('A', 'ช่องบน (บานกระจก)', 0, 60, 60, 60, 'glass', 2),
      c('B', 'ชั้นล่าง (บานทึบ)', 0, 0, 60, 60, 'solid', 1),
    ],
  },
  {
    key: 'large',
    label: 'ตู้ใหญ่ — กระจกบน 2 ช่อง + ลิ้นชัก + บานทึบล่าง',
    width_cm: 160, height_cm: 200, depth_cm: 50,
    compartments: [
      c('A', 'กระจกบนซ้าย', 0, 100, 80, 100, 'glass', 3),
      c('B', 'กระจกบนขวา', 80, 100, 80, 100, 'glass', 3),
      c('D1', 'ลิ้นชักซ้าย', 0, 80, 80, 20, 'drawer', 1, 0),
      c('D2', 'ลิ้นชักขวา', 80, 80, 80, 20, 'drawer', 1, 0),
      c('C', 'ชั้นล่าง (บานทึบ)', 0, 0, 160, 80, 'solid', 2, 2, true),
    ],
  },
  {
    key: 'two',
    label: 'ตู้ 2 ช่อง — กระจกบน + บานทึบล่าง',
    width_cm: 90, height_cm: 185, depth_cm: 45,
    compartments: [
      c('A', 'ช่องบน (บานกระจก)', 0, 90, 90, 95, 'glass', 3),
      c('B', 'ชั้นล่าง (บานทึบ)', 0, 0, 90, 90, 'solid', 2, 2, true),
    ],
  },
  {
    key: 'drawers',
    label: 'กระจกบน + ลิ้นชัก 2 + บานทึบล่าง',
    width_cm: 90, height_cm: 185, depth_cm: 45,
    compartments: [
      c('A', 'ช่องบน (บานกระจก)', 0, 100, 90, 85, 'glass', 3),
      c('D1', 'ลิ้นชักซ้าย', 0, 80, 45, 20, 'drawer', 1, 0),
      c('D2', 'ลิ้นชักขวา', 45, 80, 45, 20, 'drawer', 1, 0),
      c('B', 'ชั้นล่าง (บานทึบ)', 0, 0, 90, 80, 'solid', 2, 2, true),
    ],
  },
  {
    key: 'glass2',
    label: 'กระจก 2 ช่อง บน-ล่าง',
    width_cm: 90, height_cm: 185, depth_cm: 45,
    compartments: [
      c('A', 'ช่องบน (บานกระจก)', 0, 95, 90, 90, 'glass', 3),
      c('B', 'ช่องล่าง (บานกระจก)', 0, 0, 90, 95, 'glass', 3),
    ],
  },
  {
    key: 'tall',
    label: 'กระจกสูง + บานทึบล่าง',
    width_cm: 90, height_cm: 185, depth_cm: 45,
    compartments: [
      c('A', 'ช่องบน (บานกระจก)', 0, 75, 90, 110, 'glass', 4),
      c('B', 'ชั้นล่าง (บานทึบ)', 0, 0, 90, 75, 'solid', 1),
    ],
  },
];

// อ้างอิงตำแหน่งแบบที่คนอ่านเข้าใจ เช่น "C1-A ชั้น 2"
export function locationLabel(cabinetCode: string, comp: Pick<StorageCompartment, 'code' | 'front'>, level?: number | null): string {
  const base = `${cabinetCode}-${comp.code}`;
  return comp.front === 'drawer' || !level ? base : `${base} ชั้น ${level}`;
}

// ----- วันหมดอายุ -----

// ใกล้หมดอายุ = เหลือไม่เกินกี่วัน (ตรงกับ backend EXPIRING_DAYS และกล่องสีส้มในภาพ 3D)
export const EXPIRING_DAYS = 90;

// เหลืออีกกี่วัน (ติดลบ = หมดแล้ว) · ไม่ระบุวัน = null
export function expiryDays(date?: string | null): number | null {
  if (!date) return null;
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  const today = new Date();
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.round((new Date(y, m - 1, d).getTime() - t0) / 86400000);
}

export interface ExpiryStats {
  expired: number;
  expiring: number;
}

// นับจากล็อตที่โหลดมาแล้ว (หน้าตู้/หน้าห้องมีรายการล็อตอยู่แล้ว)
export function expiryStats(lots: Pick<CabinetLot, 'expiry_date'>[]): ExpiryStats {
  let expired = 0;
  let expiring = 0;
  for (const l of lots) {
    const d = expiryDays(l.expiry_date);
    if (d === null) continue;
    if (d < 0) expired++;
    else if (d <= EXPIRING_DAYS) expiring++;
  }
  return { expired, expiring };
}
