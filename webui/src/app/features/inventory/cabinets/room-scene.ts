import * as THREE from 'three';

import { CabinetRotation, StorageRoomDetail, expiryStats } from '../../../core/models/storage.model';
import { CabinetModel, PickTarget, SharedMaterials, describePick } from './cabinet-model';
import { HoverInfo, ThreeStage, disposeTree } from './three-stage';

export interface RoomSceneHandlers {
  select(cabinetId: number | null): void;
  // ดับเบิลคลิกตู้ → ไปหน้าจัดของในตู้
  open(cabinetId: number): void;
  hover(info: HoverInfo | null, x: number, y: number): void;
}

const WALL_H = 250;
const WALL_T = 8;

// ทั้งห้อง 3 มิติ (หน้า /inventory/rooms) — กลางห้องอยู่ที่ (0,0,0) · ผนังหลังอยู่ด้าน -z, ผนังซ้ายด้าน -x
// ตำแหน่งตู้ในข้อมูลวัดจากมุมซ้ายหลัง → แปลงด้วย toWorld()
export class RoomScene extends ThreeStage {
  private readonly mat = new SharedMaterials();
  private readonly roomMat = {
    floor: new THREE.MeshStandardMaterial({ color: '#f3f6f6', roughness: 0.95 }),
    wall: new THREE.MeshStandardMaterial({ color: '#e8eeee', roughness: 1 }),
    grid: new THREE.LineBasicMaterial({ color: '#d5e0de' }),
  };
  private shell = new THREE.Group();
  private models = new Map<number, CabinetModel>();
  private room: StorageRoomDetail | null = null;
  private selectedId: number | null = null;
  private conflicts = new Set<number>();

  constructor(host: HTMLElement, private readonly handlers: RoomSceneHandlers) {
    super(host);
    this.scene.add(this.shell);
    this.controls.minDistance = 80;
    this.controls.maxDistance = 3000;
  }

  // ----- ใช้จากภายนอก -----

  setRoom(room: StorageRoomDetail, keepView = false): void {
    const same = this.room?.id === room.id;
    const sizeChanged = !same || this.room!.width_cm !== room.width_cm || this.room!.depth_cm !== room.depth_cm;
    this.room = room;
    if (sizeChanged) this.buildShell(room);

    const open = new Map([...this.models].map(([id, m]) => [id, same ? m.openIds() : []]));
    this.models.forEach((m) => m.dispose());
    this.models.clear();
    for (const cab of room.cabinets) {
      const model = new CabinetModel(cab, this.mat);
      const s = expiryStats(cab.lots);
      model.group.add(codeLabel(cab.code, cab.height_cm, s.expired ? 'expired' : s.expiring ? 'expiring' : null));
      this.scene.add(model.group);
      model.restoreOpen(open.get(cab.id) ?? []);
      this.models.set(cab.id, model);
      this.place(cab.id, cab.pos_x_cm, cab.pos_z_cm, cab.rotation);
    }
    this.refreshMarks();
    if (!keepView || !same) this.resetView();
  }

  // ขยับตู้ทันทีระหว่างลากในผัง 2 มิติ (ไม่สร้างโมเดลใหม่)
  place(cabinetId: number, x: number, z: number, rotation: CabinetRotation): void {
    const m = this.models.get(cabinetId);
    if (!m || !this.room) return;
    m.group.position.set(x - this.room.width_cm / 2, 0, z - this.room.depth_cm / 2);
    // ข้อมูลหมุนตามเข็มเมื่อมองจากบน = หมุนรอบแกน y ทางลบ
    m.group.rotation.y = -THREE.MathUtils.degToRad(rotation);
  }

  setSelected(cabinetId: number | null): void {
    this.selectedId = cabinetId;
    this.refreshMarks();
  }

  // ตู้ที่วางทับกัน/ล้นห้อง → กรอบแดง
  setConflicts(ids: Iterable<number>): void {
    this.conflicts = new Set(ids);
    this.refreshMarks();
  }

  setAllOpen(open: boolean): void {
    this.models.forEach((m) => m.setAllOpen(open));
  }

  resetView(): void {
    const W = this.room?.width_cm ?? 400;
    const D = this.room?.depth_cm ?? 300;
    const size = Math.max(W, D);
    this.controls.target.set(0, 70, 0);
    this.camera.position.set(W * 0.38, size * 0.75 + 120, D / 2 + size * 0.85);
    this.controls.update();
  }

  // มองลงจากด้านบน (เทียบกับผัง 2 มิติ)
  topView(): void {
    const size = Math.max(this.room?.width_cm ?? 400, this.room?.depth_cm ?? 300);
    this.controls.target.set(0, 0, 0);
    this.camera.position.set(0, size * 1.6, 1);
    this.controls.update();
  }

  override dispose(): void {
    this.models.forEach((m) => m.dispose());
    this.mat.dispose();
    super.dispose();
  }

  // ----- พื้น/ผนัง -----

  private buildShell(room: StorageRoomDetail): void {
    this.shell.removeFromParent();
    disposeTree(this.shell, new Set(Object.values(this.roomMat)));
    this.shell = new THREE.Group();
    this.scene.add(this.shell);
    const W = room.width_cm;
    const D = room.depth_cm;

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), this.roomMat.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.shell.add(floor);

    // เส้นตาราง 50 ซม. ช่วยกะระยะ
    const pts: number[] = [];
    for (let x = 50; x < W; x += 50) pts.push(x - W / 2, 0.2, -D / 2, x - W / 2, 0.2, D / 2);
    for (let z = 50; z < D; z += 50) pts.push(-W / 2, 0.2, z - D / 2, W / 2, 0.2, z - D / 2);
    const grid = new THREE.BufferGeometry();
    grid.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.shell.add(new THREE.LineSegments(grid, this.roomMat.grid));

    // ผนังหลัง + ผนังซ้าย (มองจากมุมหน้าขวาเห็นตู้ชัด) — ผนังด้านที่กล้องอยู่ไม่วาด
    for (const [w, d, x, z] of [
      [W + WALL_T * 2, WALL_T, 0, -D / 2 - WALL_T / 2],
      [WALL_T, D, -W / 2 - WALL_T / 2, 0],
    ]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, WALL_H, d), this.roomMat.wall);
      wall.position.set(x, WALL_H / 2, z);
      wall.receiveShadow = true;
      this.shell.add(wall);
    }
    // ขอบพื้นอีก 2 ด้าน
    const edge = new THREE.BufferGeometry();
    edge.setAttribute('position', new THREE.Float32BufferAttribute([W / 2, 0.3, -D / 2, W / 2, 0.3, D / 2, W / 2, 0.3, D / 2, -W / 2, 0.3, D / 2], 3));
    this.shell.add(new THREE.LineSegments(edge, new THREE.LineBasicMaterial({ color: '#94a3b8' })));

    const half = Math.max(W, D) / 2 + 80;
    this.sun.position.set(W * 0.25, 420, D / 2 + 260);
    this.fitShadow(half, 420);
  }

  private refreshMarks(): void {
    this.models.forEach((m, id) => {
      if (this.conflicts.has(id)) m.setOutlined(true, '#ef4444');
      else m.setOutlined(id === this.selectedId);
    });
  }

  // ----- เหตุการณ์ -----

  protected override tick(dt: number): void {
    this.models.forEach((m) => m.tick(dt));
  }

  protected click(e: PointerEvent): void {
    const pick = this.hit(e);
    if (!pick) return this.handlers.select(null);
    if (pick.kind === 'front') this.models.get(pick.cabinetId)?.toggle(pick.compartmentId);
    this.handlers.select(pick.cabinetId);
  }

  protected override dblclick(e: MouseEvent): void {
    const pick = this.hit(e);
    if (pick) this.handlers.open(pick.cabinetId);
  }

  protected hoverAt(e: PointerEvent): void {
    const pick = this.hit(e);
    this.setCursor(!!pick);
    const model = pick && this.models.get(pick.cabinetId);
    if (!pick || !model) return this.handlers.hover(null, 0, 0);
    const { x, y } = this.local(e);
    this.handlers.hover(describePick(model, pick, '', 'ดับเบิลคลิกเพื่อจัดของในตู้'), x, y);
  }

  protected override leave(): void {
    this.handlers.hover(null, 0, 0);
  }

  private hit(e: MouseEvent): PickTarget | null {
    const all = [...this.models.values()].flatMap((m) => m.pickables);
    return this.pickAt<PickTarget>(e, all);
  }
}

// ป้ายรหัสตู้ลอยเหนือตู้ (หันหากล้องเสมอ) — มีของหมดอายุ = ป้ายแดง + "!" · ใกล้หมด = ป้ายส้ม
const LABEL_BG = { none: 'rgba(15, 118, 110, 0.92)', expired: 'rgba(220, 38, 38, 0.95)', expiring: 'rgba(217, 119, 6, 0.95)' };

function codeLabel(code: string, height: number, warn: 'expired' | 'expiring' | null): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 112;
  const g = canvas.getContext('2d')!;
  g.fillStyle = LABEL_BG[warn ?? 'none'];
  g.beginPath();
  g.roundRect(8, 8, 240, 96, 28);
  g.fill();
  g.fillStyle = '#ffffff';
  g.font = 'bold 60px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(warn ? `${code} !` : code, 128, 58, 220);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  sprite.scale.set(36, 15.75, 1);
  sprite.position.set(0, height + 18, 0);
  sprite.renderOrder = 10;
  return sprite;
}
