import * as THREE from 'three';

import { StorageCabinetDetail } from '../../../core/models/storage.model';
import { CabinetModel, PickTarget, SharedMaterials, describePick } from './cabinet-model';
import { HoverInfo, ThreeStage } from './three-stage';

export { expiryDays, lotColor } from './cabinet-model';
export type { HoverInfo } from './three-stage';

export interface SceneHandlers {
  select(compartmentId: number | null): void;
  hover(info: HoverInfo | null, x: number, y: number): void;
}

// ตู้เดี่ยว 3 มิติ (หน้า /inventory/cabinets) — คลิกบาน/ลิ้นชัก = เปิด-ปิด + เลือกช่อง · ชี้ที่กล่องยา = tooltip
export class CabinetScene extends ThreeStage {
  private readonly mat = new SharedMaterials();
  private model: CabinetModel | null = null;

  constructor(host: HTMLElement, private readonly handlers: SceneHandlers) {
    super(host);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(400, 48), new THREE.MeshStandardMaterial({ color: '#f1f5f4', roughness: 1 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.controls.minDistance = 60;
    this.controls.maxDistance = 900;
  }

  // ----- ใช้จากภายนอก -----

  setCabinet(cabinet: StorageCabinetDetail, keepView = false): void {
    const same = this.model?.cabinet.id === cabinet.id;
    const open = same ? this.model!.openIds() : [];
    this.model?.dispose();
    this.model = new CabinetModel(cabinet, this.mat);
    this.scene.add(this.model.group);
    this.model.restoreOpen(open);
    if (!keepView || !same) this.resetView();
  }

  setSelected(compartmentId: number | null): void {
    this.model?.setSelected(compartmentId);
  }

  toggle(compartmentId: number, open?: boolean): void {
    this.model?.toggle(compartmentId, open);
  }

  setAllOpen(open: boolean): void {
    this.model?.setAllOpen(open);
  }

  resetView(): void {
    const h = this.model?.cabinet.height_cm ?? 180;
    const w = this.model?.cabinet.width_cm ?? 90;
    this.controls.target.set(0, h / 2, 0);
    const dist = Math.max(h, w) * 1.75;
    this.camera.position.set(dist * 0.42, h * 0.62, dist);
    this.controls.update();
  }

  override dispose(): void {
    this.model?.dispose();
    this.mat.dispose();
    super.dispose();
  }

  // ----- เหตุการณ์ -----

  protected override tick(dt: number): void {
    this.model?.tick(dt);
  }

  protected click(e: PointerEvent): void {
    const pick = this.hit(e);
    if (!pick) return this.handlers.select(null);
    if (pick.kind === 'front') this.model!.toggle(pick.compartmentId);
    this.handlers.select(pick.compartmentId);
  }

  protected hoverAt(e: PointerEvent): void {
    const pick = this.hit(e);
    this.setCursor(!!pick);
    if (!pick || !this.model) return this.handlers.hover(null, 0, 0);
    const { x, y } = this.local(e);
    this.handlers.hover(describePick(this.model, pick, '', 'คลิกเพื่อดูของในช่อง'), x, y);
  }

  protected override leave(): void {
    this.handlers.hover(null, 0, 0);
  }

  // เปลือกตู้ (compartmentId 0) ไม่นับ — หน้านี้สนใจเฉพาะช่อง
  private hit(e: PointerEvent): PickTarget | null {
    const pick = this.model ? this.pickAt<PickTarget>(e, this.model.pickables) : null;
    return pick && pick.compartmentId ? pick : null;
  }
}
