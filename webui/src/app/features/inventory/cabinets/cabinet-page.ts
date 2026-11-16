import { Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

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
  CabinetLot,
  CabinetPayload,
  CompartmentFront,
  ExpiryStats,
  FRONT_LABEL,
  StorageCabinet,
  StorageCabinetDetail,
  StorageCompartment,
  expiryStats,
  locationLabel,
} from '../../../core/models/storage.model';
import { ExpiryBadgeComponent } from './expiry-badge';
import { BackButtonComponent } from '../../../ui/back-button/back-button';
import { InventoryTabsComponent } from '../inventory-tabs/inventory-tabs';
import { CabinetScene, HoverInfo, expiryDays, lotColor } from './cabinet-scene';

// ตู้เก็บยาแบบ 3 มิติ — เลือกตู้ → คลิกบาน/ลิ้นชักเพื่อเปิด → เลือกช่องแล้วจัดล็อตเข้า/ออก
@Component({
  selector: 'app-cabinet-page',
  standalone: true,
  imports: [
    BackButtonComponent, InventoryTabsComponent, ExpiryBadgeComponent, RouterLink, CommonModule, FormsModule, ButtonModule, DialogModule,
    InputTextModule, SelectModule, ToastModule, TooltipModule, ConfirmDialogModule,
  ],
  templateUrl: './cabinet-page.html',
  styleUrls: ['../../../ui/styles/list-page.scss', './cabinet-page.scss'],
  providers: [MessageService, ConfirmationService],
})
export class CabinetPageComponent implements OnInit, OnDestroy {
  private readonly api = inject(StorageService);
  private readonly zone = inject(NgZone);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  readonly frontLabel = FRONT_LABEL;
  readonly lotColor = lotColor;
  readonly presets = CABINET_PRESETS;
  readonly frontOptions = (Object.keys(FRONT_LABEL) as CompartmentFront[]).map((v) => ({ label: FRONT_LABEL[v], value: v }));

  cabinets: StorageCabinet[] = [];
  roomOptions: { label: string; value: number }[] = [];
  current: StorageCabinetDetail | null = null;
  selectedId: number | null = null;
  unplaced: CabinetLot[] = [];
  loading = false;
  hover: { info: HoverInfo; x: number; y: number } | null = null;
  currentStats: ExpiryStats = { expired: 0, expiring: 0 };

  // วางล็อตเข้าช่องที่เลือก
  placeLotId: number | null = null;
  placeLevel = 1;
  placing = false;

  // เพิ่ม/แก้ตู้
  showEditor = false;
  editingId: number | null = null;
  presetKey = 'two';
  form: CabinetPayload = this.blankForm();
  saving = false;

  private scene: CabinetScene | null = null;

  // viewport อยู่ใน @if — สร้าง/ทิ้งฉากตามที่ element โผล่/หายไป
  @ViewChild('viewport') set viewport(ref: ElementRef<HTMLDivElement> | undefined) {
    if (ref && !this.scene) {
      this.scene = this.zone.runOutsideAngular(
        () =>
          new CabinetScene(ref.nativeElement, {
            select: (id) => this.zone.run(() => this.select(id, false)),
            hover: (info, x, y) => this.zone.run(() => (this.hover = info ? { info, x, y } : null)),
          }),
      );
      if (this.current) this.scene.setCabinet(this.current);
      this.scene.setSelected(this.selectedId);
    } else if (!ref && this.scene) {
      this.scene.dispose();
      this.scene = null;
    }
  }

  ngOnInit(): void {
    this.loadList(Number(this.route.snapshot.queryParamMap.get('id')) || undefined);
    this.loadUnplaced();
    this.api.rooms().subscribe({
      next: (res) => (this.roomOptions = res.data.rooms.map((r) => ({ label: `${r.code} · ${r.name}`, value: r.id }))),
    });
  }

  ngOnDestroy(): void {
    this.scene?.dispose();
  }

  // ----- โหลด -----

  loadList(selectId?: number): void {
    this.loading = true;
    this.api.cabinets().subscribe({
      next: (res) => {
        this.cabinets = res.data;
        this.loading = false;
        const pick = res.data.find((c) => c.id === selectId) ?? res.data.find((c) => c.id === this.current?.id) ?? res.data[0];
        if (pick) this.openCabinet(pick.id);
        else this.current = null;
      },
      error: (err) => {
        this.loading = false;
        this.toastError(err);
      },
    });
  }

  openCabinet(id: number, keepView = false): void {
    this.api.cabinet(id).subscribe({
      next: (res) => {
        const switched = this.current?.id !== id;
        this.current = res.data;
        if (switched) {
          this.selectedId = null;
          this.router.navigate([], { relativeTo: this.route, queryParams: { id }, replaceUrl: true });
        }
        this.scene?.setCabinet(res.data, keepView);
        this.scene?.setSelected(this.selectedId);
        // อัปเดตเลข/ป้ายเตือนบนการ์ดตู้ด้วย
        this.currentStats = expiryStats(res.data.lots);
        const card = this.cabinets.find((c) => c.id === id);
        if (card) {
          card.lot_count = res.data.lots.length;
          card.expired_count = this.currentStats.expired;
          card.expiring_count = this.currentStats.expiring;
        }
      },
      error: (err) => this.toastError(err),
    });
  }

  loadUnplaced(): void {
    this.api.unplacedLots().subscribe({ next: (res) => (this.unplaced = res.data) });
  }

  // ----- เลือกช่อง / เปิดปิด -----

  // fromList = กดจากรายการด้านข้าง → เปิดบานให้เห็นด้วย
  select(id: number | null, fromList = true): void {
    this.selectedId = id;
    this.scene?.setSelected(id);
    if (id && fromList) this.scene?.toggle(id, true);
    this.placeLevel = 1;
    this.placeLotId = null;
  }

  setAllOpen(open: boolean): void {
    this.scene?.setAllOpen(open);
  }

  resetView(): void {
    this.scene?.resetView();
  }

  get selected(): StorageCompartment | null {
    return this.current?.compartments.find((c) => c.id === this.selectedId) ?? null;
  }

  levelsOf(comp: StorageCompartment): { level: number; lots: CabinetLot[] }[] {
    const lots = this.current?.lots.filter((l) => l.storage_compartment_id === comp.id) ?? [];
    if (comp.front === 'drawer') return [{ level: 1, lots }];
    return Array.from({ length: comp.levels }, (_, i) => ({ level: i + 1, lots: lots.filter((l) => (l.storage_level ?? 1) === i + 1) }));
  }

  compStats(comp: StorageCompartment): ExpiryStats {
    return expiryStats(this.current?.lots.filter((l) => l.storage_compartment_id === comp.id) ?? []);
  }

  lotsIn(comp: StorageCompartment): number {
    return this.current?.lots.filter((l) => l.storage_compartment_id === comp.id).length ?? 0;
  }

  // short = ใช้ในแถวล็อต (ที่แคบ)
  levelOptions(comp: StorageCompartment, short = false) {
    return Array.from({ length: comp.levels }, (_, i) => ({ label: `ชั้น ${i + 1}${i === 0 && !short ? ' (บนสุด)' : ''}`, value: i + 1 }));
  }

  get unplacedOptions() {
    return this.unplaced.map((l) => ({
      label: `${l.product_name} · ${l.lot_no} · ${l.quantity_remaining.toLocaleString('th-TH')} ${l.unit}`,
      value: l.id,
    }));
  }

  where(comp: StorageCompartment, level?: number | null): string {
    return this.current ? locationLabel(this.current.code, comp, level) : '';
  }

  // ----- จัดล็อต -----

  place(): void {
    const comp = this.selected;
    if (!comp?.id || !this.placeLotId) return;
    this.placing = true;
    this.api.setLotLocation(this.placeLotId, comp.id, comp.front === 'drawer' ? 1 : this.placeLevel).subscribe({
      next: (res) => {
        this.placing = false;
        this.placeLotId = null;
        this.messages.add({ severity: 'success', summary: 'วางแล้ว', detail: `${res.data.product_name} → ${this.where(comp, res.data.storage_level)}` });
        this.afterMove();
      },
      error: (err) => {
        this.placing = false;
        this.toastError(err);
      },
    });
  }

  moveLevel(lot: CabinetLot, level: number): void {
    if (!lot.storage_compartment_id || level === lot.storage_level) return;
    this.api.setLotLocation(lot.id, lot.storage_compartment_id, level).subscribe({
      next: () => this.afterMove(),
      error: (err) => this.toastError(err),
    });
  }

  takeOut(lot: CabinetLot): void {
    this.api.setLotLocation(lot.id, null).subscribe({
      next: () => {
        this.messages.add({ severity: 'info', summary: 'เอาออกจากตู้แล้ว', detail: `${lot.product_name} (${lot.lot_no}) — ยังไม่ระบุที่เก็บ` });
        this.afterMove();
      },
      error: (err) => this.toastError(err),
    });
  }

  private afterMove(): void {
    if (this.current) this.openCabinet(this.current.id, true);
    this.loadUnplaced();
  }

  // ----- เพิ่ม / แก้ / ลบตู้ -----

  openCreate(): void {
    this.editingId = null;
    this.presetKey = 'two';
    this.form = this.blankForm();
    this.applyPreset('two');
    this.showEditor = true;
  }

  openEdit(): void {
    const c = this.current;
    if (!c) return;
    this.editingId = c.id;
    this.form = {
      code: c.code, name: c.name, room_id: c.room_id ?? null, width_cm: c.width_cm, height_cm: c.height_cm, depth_cm: c.depth_cm,
      color: c.color, note: c.note ?? '',
      compartments: c.compartments.map(({ lot_count: _n, ...rest }) => ({ ...rest })),
    };
    this.showEditor = true;
  }

  applyPreset(key: string): void {
    const p = this.presets.find((x) => x.key === key);
    if (!p) return;
    this.presetKey = key;
    Object.assign(this.form, { width_cm: p.width_cm, height_cm: p.height_cm, depth_cm: p.depth_cm });
    this.form.compartments = p.compartments.map((c) => ({ ...c }));
    if (!this.form.name || this.presets.some((x) => x.label === this.form.name)) this.form.name = p.label;
  }

  addCompartment(): void {
    const used = new Set(this.form.compartments.map((c) => c.code));
    let code = 'A';
    for (let i = 0; used.has(code); i++) code = String.fromCharCode(65 + i);
    this.form.compartments = [
      ...this.form.compartments,
      { code, name: '', x_cm: 0, y_cm: 0, width_cm: this.form.width_cm, height_cm: 40, front: 'solid', door_count: 2, levels: 1, has_lock: false },
    ];
  }

  removeCompartment(i: number): void {
    this.form.compartments = this.form.compartments.filter((_, k) => k !== i);
  }

  save(): void {
    const f = this.form;
    if (!f.code?.trim() || !f.name?.trim() || !f.compartments.length) {
      this.messages.add({ severity: 'warn', summary: 'กรอกไม่ครบ', detail: 'ใส่รหัสตู้ ชื่อตู้ และอย่างน้อย 1 ช่อง' });
      return;
    }
    const payload: CabinetPayload = {
      ...f,
      room_id: f.room_id || null,
      note: f.note || null,
      compartments: f.compartments.map(({ lot_count: _n, ...c }) => ({
        ...c,
        x_cm: +c.x_cm, y_cm: +c.y_cm, width_cm: +c.width_cm, height_cm: +c.height_cm,
        door_count: +c.door_count, levels: +c.levels,
      })),
      width_cm: +f.width_cm, height_cm: +f.height_cm, depth_cm: +f.depth_cm,
    };
    this.saving = true;
    const req$ = this.editingId ? this.api.update(this.editingId, payload) : this.api.create(payload);
    req$.subscribe({
      next: (res) => {
        this.saving = false;
        this.showEditor = false;
        this.messages.add({ severity: 'success', summary: 'บันทึกแล้ว', detail: res.message });
        this.loadList(res.data.id);
      },
      error: (err) => {
        this.saving = false;
        this.toastError(err);
      },
    });
  }

  confirmDelete(): void {
    const c = this.current;
    if (!c) return;
    this.confirm.confirm({
      header: 'ลบตู้',
      message: `ลบตู้ ${c.code} "${c.name}"? (ตู้ที่ยังมีของอยู่ต้องย้ายของออกก่อน)`,
      icon: 'pi pi-trash',
      rejectButtonProps: { label: 'ไม่ลบ', severity: 'secondary', outlined: true },
      acceptButtonProps: { label: 'ลบ', severity: 'danger' },
      accept: () =>
        this.api.remove(c.id).subscribe({
          next: () => {
            this.messages.add({ severity: 'success', summary: 'ลบแล้ว', detail: c.code });
            this.current = null;
            this.loadList();
          },
          error: (err) => this.toastError(err),
        }),
    });
  }

  // ภาพหน้าตู้ 2 มิติในหน้าต่างแก้ไข (SVG — แกน y กลับหัว)
  previewY(c: StorageCompartment): number {
    return this.form.height_cm - c.y_cm - c.height_cm;
  }

  // ตำแหน่ง y (SVG) ของแผ่นชั้นในช่องบานกระจก
  shelfLines(c: StorageCompartment): number[] {
    const levels = Math.max(1, +c.levels);
    return Array.from({ length: levels - 1 }, (_, k) => this.previewY(c) + (+c.height_cm / levels) * (k + 1));
  }

  expiryText(date?: string | null): string {
    const d = expiryDays(date);
    if (d === null) return 'ไม่ระบุวันหมดอายุ';
    if (d < 0) return `หมดอายุแล้ว ${-d} วัน`;
    if (d <= 90) return `หมดอายุอีก ${d} วัน`;
    return `หมดอายุ ${new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }).format(new Date(date + 'T00:00:00'))}`;
  }

  expiryClass(date?: string | null): string {
    const d = expiryDays(date);
    return d === null ? '' : d < 0 ? 'expired' : d <= 90 ? 'soon' : '';
  }

  private blankForm(): CabinetPayload {
    const n = this.cabinets.length + 1;
    return { code: `C${n}`, name: '', room_id: null, width_cm: 90, height_cm: 185, depth_cm: 45, color: '#d5dade', note: '', compartments: [] };
  }

  private toastError(err: any): void {
    const msg = err?.error?.message;
    this.messages.add({ severity: 'error', summary: 'ผิดพลาด', detail: Array.isArray(msg) ? msg.join(', ') : msg || err.message });
  }
}
