import * as THREE from 'three';

import { CabinetLot, EXPIRING_DAYS, StorageCabinetDetail, StorageCompartment, expiryDays } from '../../../core/models/storage.model';
import { disposeTree, ease } from './three-stage';

// โมเดลตู้ 1 ใบ (Three.js ล้วน) — ใช้ทั้งหน้าตู้เดี่ยวและหน้าห้องที่มีหลายตู้
//   จุดกำเนิด = กลางฐานตู้บนพื้น · x ซ้าย→ขวา, y พื้น→บน, หน้าตู้หันไป +z (อยู่ที่ z = depth/2)
//   บาน/ลิ้นชักเปิด-ปิดแบบค่อย ๆ ขยับ (เรียก tick ทุกเฟรม)
// ความหนาแผ่นตู้
const T = 1.5;
const FRONT_GAP = 0.4;
const OPEN_ANGLE = THREE.MathUtils.degToRad(105);
const PALETTE = ['#38bdf8', '#34d399', '#a78bfa', '#f472b6', '#fbbf24', '#60a5fa', '#4ade80', '#fb923c', '#2dd4bf', '#c084fc'];

export type PickTarget =
  | { kind: 'front'; cabinetId: number; compartmentId: number }
  | { kind: 'inside'; cabinetId: number; compartmentId: number }
  | { kind: 'lot'; cabinetId: number; compartmentId: number; lot: CabinetLot };

interface Movable {
  compartmentId: number;
  apply(t: number): void;
  t: number;
}

// วัสดุที่ทุกตู้ใช้ร่วม (สีตัวตู้แยกต่อใบ เพราะแต่ละตู้สีไม่เท่ากัน)
export class SharedMaterials {
  readonly inner = new THREE.MeshStandardMaterial({ color: '#eef1f3', metalness: 0.2, roughness: 0.7 });
  readonly back = new THREE.MeshStandardMaterial({ color: '#e3e8ec', metalness: 0.15, roughness: 0.85 });
  readonly glass = new THREE.MeshPhysicalMaterial({ color: '#cfe8ef', metalness: 0, roughness: 0.05, transparent: true, opacity: 0.22, depthWrite: false });
  readonly handle = new THREE.MeshStandardMaterial({ color: '#f8fafc', metalness: 0.9, roughness: 0.2 });
  readonly lock = new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.9, roughness: 0.3 });
  readonly label = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 });

  all(): Set<THREE.Material> {
    return new Set([this.inner, this.back, this.glass, this.handle, this.lock, this.label]);
  }

  dispose(): void {
    this.all().forEach((m) => m.dispose());
  }
}

export class CabinetModel {
  readonly group = new THREE.Group();
  readonly pickables: THREE.Object3D[] = [];
  private readonly movables: Movable[] = [];
  private readonly open = new Set<number>();
  private readonly body: THREE.MeshStandardMaterial;
  private compHighlight: THREE.LineSegments | null = null;
  private outline: THREE.LineSegments | null = null;

  constructor(
    readonly cabinet: StorageCabinetDetail,
    private readonly mat: SharedMaterials,
  ) {
    this.body = new THREE.MeshStandardMaterial({ color: cabinet.color || '#d5dade', metalness: 0.6, roughness: 0.32 });
    this.build();
  }

  // ----- เปิด/ปิด -----

  toggle(compartmentId: number, open?: boolean): void {
    const next = open ?? !this.open.has(compartmentId);
    if (next) this.open.add(compartmentId);
    else this.open.delete(compartmentId);
  }

  setAllOpen(open: boolean): void {
    for (const c of this.cabinet.compartments) if (c.id) this.toggle(c.id, open);
  }

  isOpen(compartmentId: number): boolean {
    return this.open.has(compartmentId);
  }

  openIds(): number[] {
    return [...this.open];
  }

  // ตอนสร้างโมเดลใหม่แทนอันเดิม (ข้อมูลเปลี่ยน) — บานที่เปิดอยู่ให้เปิดค้างทันที ไม่เล่นแอนิเมชันซ้ำ
  restoreOpen(ids: number[]): void {
    ids.forEach((id) => this.open.add(id));
    for (const m of this.movables) {
      m.t = this.open.has(m.compartmentId) ? 1 : 0;
      m.apply(m.t);
    }
  }

  tick(dt: number): void {
    for (const m of this.movables) {
      const target = this.open.has(m.compartmentId) ? 1 : 0;
      if (m.t !== target) {
        m.t = target > m.t ? Math.min(target, m.t + dt * 2.2) : Math.max(target, m.t - dt * 2.2);
        m.apply(m.t);
      }
    }
  }

  // ----- ไฮไลต์ -----

  // กรอบรอบช่องที่เลือก (หน้าตู้เดี่ยว)
  setSelected(compartmentId: number | null): void {
    this.compHighlight = this.replaceLine(this.compHighlight, null);
    const comp = this.cabinet.compartments.find((c) => c.id === compartmentId);
    if (!comp) return;
    const { x, y, w, h } = this.rect(comp);
    const d = this.cabinet.depth_cm;
    this.compHighlight = this.replaceLine(null, edges(w + 0.6, h + 0.6, d + 0.6, '#0d9488'));
    this.compHighlight.position.set(x + w / 2, y + h / 2, 0);
  }

  // กรอบรอบทั้งตู้ (หน้าห้อง)
  setOutlined(on: boolean, color = '#0d9488'): void {
    this.outline = this.replaceLine(this.outline, null);
    if (!on) return;
    const { width_cm: W, height_cm: H, depth_cm: D } = this.cabinet;
    this.outline = this.replaceLine(null, edges(W + 3, H + 3, D + 3, color));
    this.outline.position.set(0, H / 2, 0);
  }

  dispose(): void {
    this.group.removeFromParent();
    disposeTree(this.group, this.mat.all());
  }

  // ----- สร้างตู้ -----

  private build(): void {
    const cab = this.cabinet;
    const W = cab.width_cm;
    const H = cab.height_cm;
    const D = cab.depth_cm;

    // เปลือกตู้: หลัง ซ้าย ขวา บน ล่าง — คลิกเปลือกก็นับว่าเลือกตู้นี้ (ไม่ผูกช่อง)
    for (const [w, h, d, x, y, z] of [
      [W, H, T, 0, H / 2, -D / 2 + T / 2],
      [T, H, D, -W / 2 + T / 2, H / 2, 0],
      [T, H, D, W / 2 - T / 2, H / 2, 0],
      [W, T, D, 0, H - T / 2, 0],
      [W, T, D, 0, T / 2, 0],
    ]) {
      this.pickable(this.box(w, h, d, x, y, z, this.body), { kind: 'inside', cabinetId: cab.id, compartmentId: 0 });
    }

    // แผ่นกั้นระหว่างช่อง (กันวาดซ้ำตรงที่สองช่องชนกัน)
    const drawn = new Set<string>();
    const panel = (key: string, draw: () => void) => {
      if (drawn.has(key)) return;
      drawn.add(key);
      draw();
    };

    for (const comp of cab.compartments) {
      if (!comp.id) continue;
      const { x, y, w, h } = this.rect(comp);
      if (comp.y_cm > 0) panel(`h${comp.y_cm}:${comp.x_cm}:${comp.width_cm}`, () => this.box(w, T, D - T, x + w / 2, y + T / 2, T / 2, this.body));
      if (comp.x_cm > 0) panel(`v${comp.x_cm}:${comp.y_cm}:${comp.height_cm}`, () => this.box(T, h, D - T, x + T / 2, y + h / 2, T / 2, this.body));

      // ผนังหลังของช่อง — คลิกแล้วเลือกช่อง
      const back = this.box(w - T * 2, h - T * 2, 0.4, x + w / 2, y + h / 2, -D / 2 + T + 0.3, this.mat.back);
      this.pickable(back, { kind: 'inside', cabinetId: cab.id, compartmentId: comp.id });

      if (comp.front === 'drawer') this.buildDrawer(comp);
      else {
        this.buildShelves(comp);
        if (comp.front === 'glass' || comp.front === 'solid') this.buildDoors(comp);
      }
    }
  }

  private buildShelves(comp: StorageCompartment): void {
    const { x, y, w, h } = this.rect(comp);
    const D = this.cabinet.depth_cm;
    const levels = Math.max(1, comp.levels);
    const band = h / levels;
    for (let k = 1; k < levels; k++) {
      const shelf = this.box(w - T * 2, T, D - T * 2 - 3, x + w / 2, y + band * k, -1, this.mat.inner);
      this.pickable(shelf, { kind: 'inside', cabinetId: this.cabinet.id, compartmentId: comp.id! });
    }
    // ชั้น 1 = บนสุด → ชั้น n อยู่ช่วง y ตั้งแต่ y + band*(levels-n)
    for (let level = 1; level <= levels; level++) {
      const floorY = y + band * (levels - level) + (level === levels ? T : T / 2);
      this.placeLots(this.lotsAt(comp.id!, level), comp, x + T, floorY, w - T * 2, band - T * 1.5, D, this.group);
    }
  }

  private buildDoors(comp: StorageCompartment): void {
    const { x, y, w, h } = this.rect(comp);
    const zFront = this.cabinet.depth_cm / 2 + 0.6;
    const n = Math.max(1, Math.min(2, comp.door_count || 1));
    const dw = w / n - FRONT_GAP;
    const dh = h - FRONT_GAP * 1.5;
    const pivots: { pivot: THREE.Group; sign: number }[] = [];
    const target: PickTarget = { kind: 'front', cabinetId: this.cabinet.id, compartmentId: comp.id! };

    for (let i = 0; i < n; i++) {
      // บานซ้ายบานพับซ้าย หมุนออกหน้าทวนเข็ม · บานขวาบานพับขวา
      const left = n === 1 || i === 0;
      const hingeX = left ? x + FRONT_GAP / 2 : x + w - FRONT_GAP / 2;
      const pivot = new THREE.Group();
      pivot.position.set(hingeX, y + h / 2, zFront);
      const door = new THREE.Group();
      door.position.x = left ? dw / 2 : -dw / 2;
      pivot.add(door);

      if (comp.front === 'glass') {
        const bar = 3.5;
        for (const [bw, bh, bx, by] of [
          [dw, bar, 0, dh / 2 - bar / 2],
          [dw, bar, 0, -dh / 2 + bar / 2],
          [bar, dh, -dw / 2 + bar / 2, 0],
          [bar, dh, dw / 2 - bar / 2, 0],
        ]) {
          this.pickable(this.box(bw, bh, 1.2, bx, by, 0, this.body, door), target);
        }
        const pane = this.box(dw - bar * 2, dh - bar * 2, 0.4, 0, 0, 0, this.mat.glass, door);
        pane.castShadow = false;
        this.pickable(pane, target);
      } else {
        this.pickable(this.box(dw, dh, 1.6, 0, 0, 0, this.body, door), target);
      }

      // มือจับอยู่ฝั่งที่เปิด
      const hx = left ? dw / 2 - 4 : -dw / 2 + 4;
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, Math.min(14, dh * 0.3), 12), this.mat.handle);
      handle.position.set(hx, 0, 1.9);
      handle.castShadow = true;
      door.add(handle);
      this.pickable(handle, target);
      if (comp.has_lock && (n === 1 || !left)) {
        const lock = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.8, 16), this.mat.lock);
        lock.rotation.x = Math.PI / 2;
        lock.position.set(hx, -Math.min(14, dh * 0.3) / 2 - 3, 1.1);
        door.add(lock);
      }

      this.group.add(pivot);
      pivots.push({ pivot, sign: left ? -1 : 1 });
    }

    this.movables.push({
      compartmentId: comp.id!,
      t: 0,
      apply: (t) => pivots.forEach((p) => (p.pivot.rotation.y = p.sign * OPEN_ANGLE * ease(t))),
    });
  }

  private buildDrawer(comp: StorageCompartment): void {
    const { x, y, w, h } = this.rect(comp);
    const D = this.cabinet.depth_cm;
    const drawer = new THREE.Group();
    const baseZ = D / 2 + 0.75;
    drawer.position.set(x + w / 2, y + h / 2, baseZ);
    const target: PickTarget = { kind: 'front', cabinetId: this.cabinet.id, compartmentId: comp.id! };

    const fw = w - FRONT_GAP;
    const fh = h - FRONT_GAP * 1.5;
    this.pickable(this.box(fw, fh, 1.5, 0, 0, 0, this.body, drawer), target);
    // มือจับแนวนอน
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, Math.min(16, fw * 0.4), 12), this.mat.handle);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(0, fh * 0.15, 1.8);
    drawer.add(handle);
    this.pickable(handle, target);

    // ถาดลิ้นชัก (เห็นตอนดึงออก)
    const trayD = D * 0.85;
    const trayH = Math.max(4, h - 5);
    const tw = w - T * 2 - 1;
    const tz = -trayD / 2 - 0.75;
    const ty = -fh / 2 + 1.5;
    this.box(tw, 0.6, trayD, 0, ty, tz, this.mat.inner, drawer);
    this.box(0.6, trayH, trayD, -tw / 2, ty + trayH / 2, tz, this.mat.inner, drawer);
    this.box(0.6, trayH, trayD, tw / 2, ty + trayH / 2, tz, this.mat.inner, drawer);
    this.box(tw, trayH, 0.6, 0, ty + trayH / 2, tz - trayD / 2, this.mat.inner, drawer);
    this.placeLots(this.lotsAt(comp.id!, null), comp, -tw / 2 + 0.6, ty + 0.3, tw - 1.2, trayH - 1, trayD + 1.5, drawer, true);

    this.group.add(drawer);
    this.movables.push({
      compartmentId: comp.id!,
      t: 0,
      apply: (t) => (drawer.position.z = baseZ + ease(t) * D * 0.7),
    });
  }

  // กล่องยาวางเรียงซ้าย→ขวา หน้าสุดของชั้น (ล้นก็ย่อให้พอดี)
  private placeLots(
    lots: CabinetLot[], comp: StorageCompartment, left: number, floorY: number,
    width: number, height: number, depth: number, parent: THREE.Object3D, lowProfile = false,
  ): void {
    if (!lots.length) return;
    const gap = 1.2;
    const bh = Math.max(2, Math.min(lowProfile ? height * 0.6 : 9, height - 1.5));
    const bd = Math.min(10, depth * 0.35);
    const bw = Math.min(11, (width - gap) / lots.length - gap);
    const zLocal = parent === this.group ? depth / 2 - T - bd / 2 - 3.5 : -depth / 2 + bd / 2 + 6;
    lots.forEach((lot, i) => {
      const m = new THREE.MeshStandardMaterial({ color: lotColor(lot), roughness: 0.6 });
      const pack = this.box(bw, bh, bd, left + gap + bw / 2 + i * (bw + gap), floorY + bh / 2, zLocal, m, parent);
      // แถบฉลากสีขาวด้านหน้ากล่อง
      this.box(bw * 0.8, bh * 0.35, 0.2, 0, bh * 0.1, bd / 2 + 0.11, this.mat.label, pack);
      this.pickable(pack, { kind: 'lot', cabinetId: this.cabinet.id, compartmentId: comp.id!, lot });
    });
  }

  // ----- ภายใน -----

  private rect(comp: StorageCompartment) {
    return { x: -this.cabinet.width_cm / 2 + comp.x_cm, y: comp.y_cm, w: comp.width_cm, h: comp.height_cm };
  }

  private lotsAt(compartmentId: number, level: number | null): CabinetLot[] {
    return (this.cabinet.lots ?? []).filter(
      (l) => l.storage_compartment_id === compartmentId && (level === null || (l.storage_level ?? 1) === level),
    );
  }

  private box(
    w: number, h: number, d: number, x: number, y: number, z: number,
    material: THREE.Material, parent: THREE.Object3D = this.group,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  private pickable(o: THREE.Object3D, pick: PickTarget): void {
    o.userData['pick'] = pick;
    this.pickables.push(o);
  }

  // ถอดเส้นเก่า (ถ้ามี) แล้วใส่เส้นใหม่ (ถ้ามี)
  private replaceLine<T extends THREE.LineSegments | null>(old: THREE.LineSegments | null, next: T): T {
    if (old) {
      old.removeFromParent();
      disposeTree(old);
    }
    if (next) this.group.add(next);
    return next;
  }
}

function edges(w: number, h: number, d: number, color: string): THREE.LineSegments {
  const box = new THREE.BoxGeometry(w, h, d);
  const line = new THREE.LineSegments(new THREE.EdgesGeometry(box), new THREE.LineBasicMaterial({ color }));
  box.dispose();
  return line;
}

// สีกล่อง: หมดอายุ = แดง · ใกล้หมดอายุ (EXPIRING_DAYS) = ส้ม · นอกนั้นสีตามสินค้า
export function lotColor(lot: Pick<CabinetLot, 'expiry_date' | 'product_id'>): string {
  const days = expiryDays(lot.expiry_date);
  if (days !== null && days < 0) return '#ef4444';
  if (days !== null && days <= EXPIRING_DAYS) return '#f59e0b';
  return PALETTE[lot.product_id % PALETTE.length];
}

export { expiryDays };

// tooltip ตอนชี้ที่ชิ้นส่วนตู้ — ใช้ร่วมทั้งสองหน้า
export function describePick(model: CabinetModel, pick: PickTarget, frontAction: string, insideAction: string): { title: string; lines: string[] } {
  const cab = model.cabinet;
  const comp = cab.compartments.find((c) => c.id === pick.compartmentId);
  if (!comp) return { title: `${cab.code} ${cab.name}`, lines: [insideAction] };
  const where = `${cab.code}-${comp.code}`;
  if (pick.kind === 'lot') {
    const l = pick.lot;
    return {
      title: l.product_name,
      lines: [
        `ล็อต ${l.lot_no} · คงเหลือ ${l.quantity_remaining.toLocaleString('th-TH')} ${l.unit}`,
        l.expiry_date ? `หมดอายุ ${l.expiry_date}` : 'ไม่ระบุวันหมดอายุ',
        comp.front === 'drawer' ? where : `${where} ชั้น ${l.storage_level ?? 1}`,
      ],
    };
  }
  const action = pick.kind === 'front' ? (model.isOpen(comp.id!) ? 'คลิกเพื่อปิด' : 'คลิกเพื่อเปิด') : insideAction;
  return { title: `${where} ${comp.name ?? ''}`.trim(), lines: [action] };
}
