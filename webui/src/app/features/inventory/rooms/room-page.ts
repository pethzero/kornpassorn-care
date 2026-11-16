import { Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';

import { StorageService } from '../../../core/services/storage.service';
import {
  CABINET_PRESETS,
  CabinetRotation,
  ExpiryStats,
  Placement,
  RoomPayload,
  StorageCabinet,
  StorageCabinetDetail,
  StorageRoom,
  StorageRoomDetail,
  expiryStats,
  footprint,
} from '../../../core/models/storage.model';
import { ExpiryBadgeComponent } from '../cabinets/expiry-badge';
import { BackButtonComponent } from '../../../ui/back-button/back-button';
import { InventoryTabsComponent } from '../inventory-tabs/inventory-tabs';
import { RoomScene } from '../cabinets/room-scene';
import { HoverInfo } from '../cabinets/three-stage';

// ระยะที่ตู้ขยับทีละขั้นตอนลาก/กดลูกศร (ซม.)
const SNAP = 5;

type Spot = Pick<StorageCabinet, 'pos_x_cm' | 'pos_z_cm' | 'rotation'>;

// ออกแบบห้องเก็บของ — ห้อง (A, B, …) มีหลายตู้ · ลากตู้ในผัง 2 มิติ เห็นผลใน 3 มิติทันที แล้วกดบันทึกผัง
@Component({
  selector: 'app-room-page',
  standalone: true,
  imports: [
    BackButtonComponent, InventoryTabsComponent, ExpiryBadgeComponent, CommonModule, FormsModule, ButtonModule, DialogModule,
    InputTextModule, SelectModule, ToastModule, TooltipModule, ConfirmDialogModule,
  ],
  templateUrl: './room-page.html',
  styleUrls: ['../../../ui/styles/list-page.scss', './room-page.scss'],
  providers: [MessageService, ConfirmationService],
})
export class RoomPageComponent implements OnInit, OnDestroy {
  private readonly api = inject(StorageService);
  private readonly zone = inject(NgZone);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  readonly presets = CABINET_PRESETS;
  readonly rotations: CabinetRotation[] = [0, 90, 180, 270];

  rooms: StorageRoom[] = [];
  unassigned: StorageCabinet[] = [];
  room: StorageRoomDetail | null = null;
  selectedId: number | null = null;
  loading = false;
  hover: { info: HoverInfo; x: number; y: number } | null = null;

  // ตำแหน่งที่ลาก/หมุนแล้วแต่ยังไม่บันทึก
  draft = new Map<number, Spot>();
  conflicts = new Set<number>();
  savingLayout = false;
  private drag: { id: number; dx: number; dz: number; pointerId: number } | null = null;

  // หน้าต่างห้อง
  showRoomEditor = false;
  editingRoomId: number | null = null;
  roomForm: RoomPayload = { code: '', name: '', width_cm: 400, depth_cm: 300, note: '' };

  // หน้าต่างเพิ่มตู้ในห้อง
  showAddCabinet = false;
  addForm = { preset: 'small', code: '', name: '', color: '#d5dade' };
  saving = false;

  private scene: RoomScene | null = null;
  @ViewChild('plan') private planRef?: ElementRef<SVGSVGElement>;

  @ViewChild('viewport') set viewport(ref: ElementRef<HTMLDivElement> | undefined) {
    if (ref && !this.scene) {
      this.scene = this.zone.runOutsideAngular(
        () =>
          new RoomScene(ref.nativeElement, {
            select: (id) => this.zone.run(() => this.select(id)),
            open: (id) => this.zone.run(() => this.openCabinet(id)),
            hover: (info, x, y) => this.zone.run(() => (this.hover = info ? { info, x, y } : null)),
          }),
      );
      if (this.room) this.syncScene();
    } else if (!ref && this.scene) {
      this.scene.dispose();
      this.scene = null;
    }
  }

  ngOnInit(): void {
    this.loadRooms(Number(this.route.snapshot.queryParamMap.get('id')) || undefined);
  }

  ngOnDestroy(): void {
    this.scene?.dispose();
  }

  // ----- โหลด -----

  loadRooms(selectId?: number): void {
    this.loading = true;
    this.api.rooms().subscribe({
      next: (res) => {
        this.loading = false;
        this.rooms = res.data.rooms;
        this.unassigned = res.data.unassigned;
        const pick = this.rooms.find((r) => r.id === selectId) ?? this.rooms.find((r) => r.id === this.room?.id) ?? this.rooms[0];
        if (pick) this.openRoom(pick.id);
        else this.room = null;
      },
      error: (err) => {
        this.loading = false;
        this.toastError(err);
      },
    });
  }

  openRoom(id: number, keepView = false): void {
    if (this.dirty && this.room?.id !== id) {
      this.messages.add({ severity: 'warn', summary: 'ยังไม่ได้บันทึกผัง', detail: 'บันทึกหรือยกเลิกการย้ายตู้ก่อนเปลี่ยนห้อง' });
      return;
    }
    this.api.room(id).subscribe({
      next: (res) => this.setRoom(res.data, keepView),
      error: (err) => this.toastError(err),
    });
  }

  private setRoom(room: StorageRoomDetail, keepView = false): void {
    const switched = this.room?.id !== room.id;
    this.room = room;
    this.draft.clear();
    if (switched) {
      this.selectedId = null;
      this.router.navigate([], { relativeTo: this.route, queryParams: { id: room.id }, replaceUrl: true });
    }
    if (!room.cabinets.some((c) => c.id === this.selectedId)) this.selectedId = null;
    const card = this.rooms.find((r) => r.id === room.id);
    if (card) Object.assign(card, { name: room.name, code: room.code, cabinet_count: room.cabinets.length });
    this.recheck();
    this.syncScene(keepView);
  }

  private syncScene(keepView = false): void {
    if (!this.scene || !this.room) return;
    this.scene.setRoom(this.room, keepView);
    this.scene.setSelected(this.selectedId);
    this.scene.setConflicts(this.conflicts);
  }

  // ----- เลือก / ตำแหน่ง -----

  select(id: number | null): void {
    this.selectedId = id;
    this.scene?.setSelected(id);
  }

  get selected(): StorageCabinetDetail | null {
    return this.room?.cabinets.find((c) => c.id === this.selectedId) ?? null;
  }

  get dirty(): boolean {
    return this.draft.size > 0;
  }

  // ตำแหน่งปัจจุบัน (รวมที่ลากแล้วยังไม่บันทึก)
  spot(c: StorageCabinet): Spot {
    return this.draft.get(c.id) ?? { pos_x_cm: c.pos_x_cm, pos_z_cm: c.pos_z_cm, rotation: c.rotation };
  }

  foot(c: StorageCabinet) {
    return footprint({ ...c, ...this.spot(c) });
  }

  move(c: StorageCabinet, patch: Partial<Spot>): void {
    const next = { ...this.spot(c), ...patch };
    next.pos_x_cm = Math.round(+next.pos_x_cm);
    next.pos_z_cm = Math.round(+next.pos_z_cm);
    const same = next.pos_x_cm === c.pos_x_cm && next.pos_z_cm === c.pos_z_cm && next.rotation === c.rotation;
    if (same) this.draft.delete(c.id);
    else this.draft.set(c.id, next);
    this.scene?.place(c.id, next.pos_x_cm, next.pos_z_cm, next.rotation);
    this.recheck();
  }

  rotate(c: StorageCabinet | null): void {
    if (!c || !this.room) return;
    const s = this.spot(c);
    const rotation = ((s.rotation + 90) % 360) as CabinetRotation;
    // หมุนแล้วดันกลับเข้าในห้อง (ตู้ยาวหมุนชิดผนังจะล้น)
    const f = footprint({ ...c, ...s, rotation });
    this.move(c, { rotation, pos_x_cm: this.clamp(s.pos_x_cm, f.w, this.room.width_cm), pos_z_cm: this.clamp(s.pos_z_cm, f.d, this.room.depth_cm) });
  }

  discardLayout(): void {
    this.draft.clear();
    this.recheck();
    this.syncScene(true);
  }

  saveLayout(): void {
    if (!this.room || !this.dirty) return;
    if (this.conflicts.size) {
      this.messages.add({ severity: 'warn', summary: 'ยังบันทึกไม่ได้', detail: 'มีตู้วางทับกันหรือล้นห้อง (กรอบแดง)' });
      return;
    }
    const items: Placement[] = [...this.draft].map(([cabinet_id, s]) => ({ cabinet_id, ...s }));
    this.savingLayout = true;
    this.api.saveLayout(this.room.id, items).subscribe({
      next: (res) => {
        this.savingLayout = false;
        this.messages.add({ severity: 'success', summary: 'บันทึกแล้ว', detail: res.message });
        this.setRoom(res.data, true);
      },
      error: (err) => {
        this.savingLayout = false;
        this.toastError(err);
      },
    });
  }

  // ตู้ที่ล้นห้องหรือทับกัน
  private recheck(): void {
    const bad = new Set<number>();
    const room = this.room;
    if (room) {
      const boxes = room.cabinets.map((c) => ({ id: c.id, f: this.foot(c) }));
      for (const { id, f } of boxes) {
        if (f.x0 < 0 || f.z0 < 0 || f.x1 > room.width_cm || f.z1 > room.depth_cm) bad.add(id);
      }
      boxes.forEach((a, i) =>
        boxes.slice(i + 1).forEach((b) => {
          if (a.f.x0 < b.f.x1 && b.f.x0 < a.f.x1 && a.f.z0 < b.f.z1 && b.f.z0 < a.f.z1) bad.add(a.id).add(b.id);
        }),
      );
    }
    this.conflicts = bad;
    this.scene?.setConflicts(bad);
  }

  // ----- ลากในผัง 2 มิติ -----

  // คลิกพื้นว่าง = เลิกเลือก
  onPlanDown(e: PointerEvent): void {
    if (!(e.target as Element).closest('.cab')) this.select(null);
  }

  startDrag(e: PointerEvent, c: StorageCabinet): void {
    e.preventDefault();
    this.select(c.id);
    const p = this.planPoint(e);
    const s = this.spot(c);
    this.drag = { id: c.id, dx: p.x - s.pos_x_cm, dz: p.y - s.pos_z_cm, pointerId: e.pointerId };
    this.planRef?.nativeElement.setPointerCapture(e.pointerId);
  }

  onDrag(e: PointerEvent): void {
    const d = this.drag;
    const c = d && this.room?.cabinets.find((x) => x.id === d.id);
    if (!d || !c || !this.room) return;
    const p = this.planPoint(e);
    const f = this.foot(c);
    const snap = (v: number) => Math.round(v / SNAP) * SNAP;
    this.move(c, {
      pos_x_cm: this.clamp(snap(p.x - d.dx), f.w, this.room.width_cm),
      pos_z_cm: this.clamp(snap(p.y - d.dz), f.d, this.room.depth_cm),
    });
  }

  endDrag(): void {
    if (this.drag) this.planRef?.nativeElement.releasePointerCapture(this.drag.pointerId);
    this.drag = null;
  }

  // ลูกศร = ขยับ 5 ซม. (Shift = 1 ซม.) · R = หมุน · Esc = เลิกเลือก
  onPlanKey(e: KeyboardEvent): void {
    const c = this.selected;
    if (!c) return;
    const step = e.shiftKey ? 1 : SNAP;
    const s = this.spot(c);
    const moves: Record<string, Partial<Spot>> = {
      ArrowLeft: { pos_x_cm: s.pos_x_cm - step },
      ArrowRight: { pos_x_cm: s.pos_x_cm + step },
      ArrowUp: { pos_z_cm: s.pos_z_cm - step },
      ArrowDown: { pos_z_cm: s.pos_z_cm + step },
    };
    if (moves[e.key]) {
      e.preventDefault();
      this.move(c, moves[e.key]);
    } else if (e.key === 'r' || e.key === 'R') {
      this.rotate(c);
    } else if (e.key === 'Escape') {
      this.select(null);
    }
  }

  private planPoint(e: PointerEvent): DOMPoint {
    const svg = this.planRef!.nativeElement;
    return new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM()!.inverse());
  }

  // ให้จุดกึ่งกลางอยู่ในช่วงที่ตู้ไม่ล้นผนัง
  private clamp(center: number, size: number, room: number): number {
    return Math.min(Math.max(center, size / 2), Math.max(size / 2, room - size / 2));
  }

  // ----- ผัง SVG -----

  get planBox(): string {
    const pad = this.planPad;
    return `${-pad} ${-pad} ${(this.room?.width_cm ?? 400) + pad * 2} ${(this.room?.depth_cm ?? 300) + pad * 2}`;
  }

  get planPad(): number {
    return Math.max(this.room?.width_cm ?? 400, this.room?.depth_cm ?? 300) * 0.06;
  }

  // ขนาดตัวอักษรในผัง (หน่วย ซม. ของ SVG) — โตตามขนาดห้อง
  get planFont(): number {
    return Math.max(this.room?.width_cm ?? 400, this.room?.depth_cm ?? 300) / 32;
  }

  cabStats(c: StorageCabinetDetail): ExpiryStats {
    return expiryStats(c.lots);
  }

  // ระดับเตือนของตู้ (จุดสีในผัง) — หมดอายุสำคัญกว่าใกล้หมด
  warnOf(c: StorageCabinetDetail): 'expired' | 'expiring' | null {
    const s = this.cabStats(c);
    return s.expired ? 'expired' : s.expiring ? 'expiring' : null;
  }

  gridLines(size: number): number[] {
    return Array.from({ length: Math.max(0, Math.ceil(size / 50) - 1) }, (_, i) => (i + 1) * 50);
  }

  // ----- ตู้เข้า/ออกห้อง -----

  openCabinet(id: number): void {
    this.router.navigate(['/inventory/cabinets'], { queryParams: { id } });
  }

  // วางตู้ที่ยังไม่อยู่ในห้องไหน เข้าห้องนี้ (หาที่ว่างชิดผนังหลังก่อน)
  assign(c: StorageCabinet): void {
    if (!this.room || this.blockIfDirty()) return;
    const spot = this.findSpot(c.width_cm, c.depth_cm);
    if (!spot) return this.roomFull();
    this.api.update(c.id, { room_id: this.room.id, ...spot }).subscribe({
      next: () => {
        this.messages.add({ severity: 'success', summary: 'วางตู้แล้ว', detail: `${c.code} → ${this.room!.name}` });
        this.afterCabinetChange(c.id);
      },
      error: (err) => this.toastError(err),
    });
  }

  unassign(c: StorageCabinet): void {
    if (this.blockIfDirty()) return;
    this.api.update(c.id, { room_id: null }).subscribe({
      next: () => {
        this.messages.add({ severity: 'info', summary: 'เอาตู้ออกจากห้องแล้ว', detail: `${c.code} — ของในตู้ยังอยู่ครบ` });
        this.selectedId = null;
        this.afterCabinetChange();
      },
      error: (err) => this.toastError(err),
    });
  }

  openAddCabinet(): void {
    if (!this.room || this.blockIfDirty()) return;
    this.addForm = { preset: 'small', code: this.nextCabinetCode(), name: '', color: '#d5dade' };
    this.showAddCabinet = true;
  }

  get addPreset() {
    return this.presets.find((p) => p.key === this.addForm.preset) ?? this.presets[0];
  }

  createCabinet(): void {
    const room = this.room;
    const p = this.addPreset;
    const f = this.addForm;
    if (!room || !f.code.trim()) return;
    const spot = this.findSpot(p.width_cm, p.depth_cm);
    if (!spot) return this.roomFull();
    this.saving = true;
    this.api
      .create({
        code: f.code.trim(),
        name: f.name.trim() || p.label.split(' — ')[0],
        room_id: room.id,
        ...spot,
        width_cm: p.width_cm,
        height_cm: p.height_cm,
        depth_cm: p.depth_cm,
        color: f.color,
        note: null,
        compartments: p.compartments.map((c) => ({ ...c })),
      })
      .subscribe({
        next: (res) => {
          this.saving = false;
          this.showAddCabinet = false;
          this.messages.add({ severity: 'success', summary: 'เพิ่มตู้แล้ว', detail: res.message });
          this.afterCabinetChange(res.data.id);
        },
        error: (err) => {
          this.saving = false;
          this.toastError(err);
        },
      });
  }

  private afterCabinetChange(selectId?: number): void {
    if (!this.room) return;
    const roomId = this.room.id;
    this.api.rooms().subscribe({
      next: (res) => {
        this.rooms = res.data.rooms;
        this.unassigned = res.data.unassigned;
      },
    });
    this.api.room(roomId).subscribe({
      next: (res) => {
        this.setRoom(res.data, true);
        if (selectId) this.select(selectId);
      },
      error: (err) => this.toastError(err),
    });
  }

  // จุดว่างแรก ไล่จากผนังหลัง ซ้าย→ขวา ทีละ 10 ซม. (หน้าตู้หันออกจากผนังหลัง)
  private findSpot(w: number, d: number): Spot | null {
    const room = this.room!;
    const taken = room.cabinets.map((c) => this.foot(c));
    for (let z = 0; z + d <= room.depth_cm; z += 10) {
      for (let x = 0; x + w <= room.width_cm; x += 10) {
        const free = taken.every((t) => !(x < t.x1 && t.x0 < x + w && z < t.z1 && t.z0 < z + d));
        if (free) return { pos_x_cm: Math.round(x + w / 2), pos_z_cm: Math.round(z + d / 2), rotation: 0 };
      }
    }
    return null;
  }

  private nextCabinetCode(): string {
    const used = new Set([...(this.room?.cabinets ?? []), ...this.unassigned].map((c) => c.code));
    const prefix = this.room?.code ?? 'C';
    let n = (this.room?.cabinets.length ?? 0) + 1;
    while (used.has(`${prefix}${n}`)) n++;
    return `${prefix}${n}`;
  }

  private blockIfDirty(): boolean {
    if (this.dirty) this.messages.add({ severity: 'warn', summary: 'ยังไม่ได้บันทึกผัง', detail: 'บันทึกหรือยกเลิกการย้ายตู้ก่อน' });
    return this.dirty;
  }

  private roomFull(): void {
    this.messages.add({ severity: 'warn', summary: 'ห้องเต็ม', detail: 'ไม่มีที่ว่างพอวางตู้นี้ — ขยายห้องหรือย้ายตู้อื่นก่อน' });
  }

  // ----- ห้อง: เพิ่ม / แก้ / ลบ -----

  openCreateRoom(): void {
    const used = new Set(this.rooms.map((r) => r.code));
    let code = 'A';
    for (let i = 1; used.has(code); i++) code = String.fromCharCode(65 + i);
    this.editingRoomId = null;
    this.roomForm = { code, name: `ห้อง ${code}`, width_cm: 400, depth_cm: 300, note: '' };
    this.showRoomEditor = true;
  }

  openEditRoom(): void {
    const r = this.room;
    if (!r) return;
    this.editingRoomId = r.id;
    this.roomForm = { code: r.code, name: r.name, width_cm: r.width_cm, depth_cm: r.depth_cm, note: r.note ?? '' };
    this.showRoomEditor = true;
  }

  saveRoom(): void {
    const f = this.roomForm;
    if (!f.code.trim() || !f.name.trim()) {
      this.messages.add({ severity: 'warn', summary: 'กรอกไม่ครบ', detail: 'ใส่รหัสและชื่อห้อง' });
      return;
    }
    const payload: RoomPayload = { ...f, width_cm: +f.width_cm, depth_cm: +f.depth_cm, note: f.note || null };
    this.saving = true;
    const req$ = this.editingRoomId ? this.api.updateRoom(this.editingRoomId, payload) : this.api.createRoom(payload);
    req$.subscribe({
      next: (res) => {
        this.saving = false;
        this.showRoomEditor = false;
        this.messages.add({ severity: 'success', summary: 'บันทึกแล้ว', detail: res.message });
        this.draft.clear();
        this.loadRooms(res.data.id);
      },
      error: (err) => {
        this.saving = false;
        this.toastError(err);
      },
    });
  }

  confirmDeleteRoom(): void {
    const r = this.room;
    if (!r) return;
    this.confirm.confirm({
      header: 'ลบห้อง',
      message: `ลบ "${r.name}"? ตู้ ${r.cabinets.length} ใบในห้องจะไม่ถูกลบ แค่กลับไปเป็นตู้ที่ยังไม่อยู่ในห้อง`,
      icon: 'pi pi-trash',
      rejectButtonProps: { label: 'ไม่ลบ', severity: 'secondary', outlined: true },
      acceptButtonProps: { label: 'ลบห้อง', severity: 'danger' },
      accept: () =>
        this.api.removeRoom(r.id).subscribe({
          next: (res) => {
            this.messages.add({ severity: 'success', summary: 'ลบแล้ว', detail: res.message });
            this.room = null;
            this.draft.clear();
            this.loadRooms();
          },
          error: (err) => this.toastError(err),
        }),
    });
  }

  // ----- อื่น ๆ -----

  setAllOpen(open: boolean): void {
    this.scene?.setAllOpen(open);
  }

  resetView(): void {
    this.scene?.resetView();
  }

  topView(): void {
    this.scene?.topView();
  }

  meters(cm: number): string {
    return (cm / 100).toLocaleString('th-TH', { maximumFractionDigits: 2 });
  }

  private toastError(err: any): void {
    const msg = err?.error?.message;
    this.messages.add({ severity: 'error', summary: 'ผิดพลาด', detail: Array.isArray(msg) ? msg.join(', ') : msg || err.message });
  }
}
