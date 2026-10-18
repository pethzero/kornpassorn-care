import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

import { LoadingSpinnerComponent } from '../../../ui/loading-spinner/loading-spinner';
import { InventoryTabsComponent } from '../inventory-tabs/inventory-tabs';
import { afterMinDuration } from '../../../core/utils/min-duration';
import { InventoryService } from '../../../core/services/inventory.service';
import {
  InventoryProduct,
  InventoryProductLot,
  InventoryProductPackage,
  LotMovement,
  LotMovementsResult,
} from '../../../core/models/inventory.model';
import { documentTypeInfo } from '../../../core/models/document.model';

@Component({
  selector: 'app-lot-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    DialogModule,
    ToastModule,
    TooltipModule,
    LoadingSpinnerComponent,
    InventoryTabsComponent,
    RouterLink,
  ],
  templateUrl: './lot-list.html',
  styleUrls: ['../../../ui/styles/list-page.scss', './lot-list.scss'],
  providers: [MessageService],
})
export class LotListComponent implements OnInit {
  lots: InventoryProductLot[] = [];
  products: InventoryProduct[] = [];
  loading = false;
  saving = false;
  showDialog = false;

  selectedProductId: number | null = null;
  showExpiringOnly = false;

  isEditMode = false;
  editingLotId: number | null = null;

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private inventoryService: InventoryService,
    private messageService: MessageService,
  ) {
    this.form = this.fb.group({
      product_id: [null, Validators.required],
      lot_no: ['', Validators.required],
      manufacture_date: [''],
      expiry_date: [''],
      package_id: [null],
      use_pack: [false],
      quantity_in: [null],
      unit_cost: [null],
      received_pack_qty: [null],
      pack_unit_cost: [null],
      supplier: [''],
      brand: [''],
      note: [''],
    });
  }

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    if (qp.get('product_id')) this.selectedProductId = Number(qp.get('product_id'));

    // มาจากปุ่ม "รับเข้ายี่ห้อนี้" ในหน้าสินค้า → เปิด dialog รับเข้าทันทีหลังโหลดสินค้าเสร็จ
    const openCreate = qp.get('new') === '1';
    const packageId = qp.get('package_id') ? Number(qp.get('package_id')) : null;

    this.loadProducts(() => {
      if (!openCreate) return;
      this.openCreateDialog();
      if (packageId) {
        this.form.patchValue({ package_id: packageId });
        this.onPackageChange();
      }
      // ล้าง new/package_id ออกจาก URL กันเปิด dialog ซ้ำตอนรีเฟรช
      this.syncUrl();
    });
    this.load();
  }

  loadProducts(onLoaded?: () => void): void {
    this.inventoryService.getProducts({ limit: 200 }).subscribe({
      next: (res) => {
        this.products = res.data;
        onLoaded?.();
      },
    });
  }

  // สินค้าที่กรองอยู่ — ใช้แสดงแถบหัว "ล็อตของ ..." พร้อมปุ่มกลับหน้าสินค้า
  filteredProduct(): InventoryProduct | undefined {
    return this.selectedProductId ? this.products.find((p) => p.id === this.selectedProductId) : undefined;
  }

  // ให้ URL ตรงกับตัวกรองสินค้าเสมอ — กด back/refresh แล้วยังอยู่ที่สินค้าเดิม
  private syncUrl(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { product_id: this.selectedProductId || null },
      replaceUrl: true,
    });
  }

  filterByProduct(productId: number): void {
    this.selectedProductId = productId;
    this.onFilterChange();
  }

  receiveDocument(): void {
    this.router.navigate(['/documents/new'], {
      queryParams: { type: 'receive', ...(this.selectedProductId ? { product_id: this.selectedProductId } : {}) },
    });
  }

  // ----- รายละเอียดล็อต (modal: ข้อมูลล็อต + ประวัติการเคลื่อนไหว) -----
  showHistory = false;
  historyLoading = false;
  history: LotMovementsResult | null = null;
  detailLot: InventoryProductLot | null = null;

  openHistory(lot: InventoryProductLot): void {
    this.detailLot = lot;
    this.showHistory = true;
    this.historyLoading = true;
    this.history = null;
    this.inventoryService.getLotMovements(lot.id!).subscribe({
      next: (res) => {
        this.history = res.data;
        this.historyLoading = false;
      },
      error: (err) => {
        this.historyLoading = false;
        this.showHistory = false;
        this.messageService.add({ severity: 'error', summary: 'ผิดพลาด', detail: err.error?.message || err.message });
      },
    });
  }

  // เอกสารที่รับล็อตนี้เข้ามา (การเคลื่อนไหวแรก) — null = ตั้งยอดยกมา
  lotReceiveDoc(): LotMovement['document'] {
    const first = this.history?.movements[0];
    return first?.kind === 'document' ? first.document : null;
  }

  // มูลค่าคงเหลือตามทุน
  remainingValue(lot: InventoryProductLot): number | null {
    if (lot.unit_cost == null) return null;
    return Math.round(this.num(lot.quantity_remaining) * this.num(lot.unit_cost) * 100) / 100;
  }

  daysLeftLabel(lot: InventoryProductLot): string {
    if (!lot.expiry_date) return 'ไม่มีวันหมดอายุ';
    if (this.isExpired(lot)) return 'หมดอายุแล้ว';
    return `อีก ${this.daysToExpiry(lot)} วัน`;
  }

  // ป้ายบอกว่าครั้งนี้เกิดอะไรขึ้นกับล็อต
  movementLabel(m: LotMovement): string {
    if (m.kind === 'opening') return 'ตั้งยอดยกมา';
    if (m.kind === 'reversal') return 'คืนสต็อก (ยกเลิกเอกสาร)';
    return documentTypeInfo(m.document?.doc_type || '').label;
  }

  movementChipClass(m: LotMovement): string {
    if (m.kind === 'reversal') return 'chip-plain';
    switch (m.document?.doc_type) {
      case 'receive':
        return 'chip-info';
      case 'patient_service':
        return 'chip-accent';
      case 'adjust':
        return 'chip-warn';
      default:
        return '';
    }
  }

  abs(n: number): number {
    return Math.abs(n);
  }

  backToProducts(): void {
    this.router.navigate(['/inventory/products']);
  }

  load(): void {
    this.loading = true;
    const startedAt = Date.now();
    const expiringBefore = this.showExpiringOnly ? this.daysFromNow(30) : undefined;

    this.inventoryService
      .getLots({
        product_id: this.selectedProductId || undefined,
        expiring_before: expiringBefore,
        limit: 200,
      })
      .subscribe({
        next: (res) => {
          afterMinDuration(startedAt, () => {
            this.lots = res.data;
            this.loading = false;
          });
        },
        error: (err) => {
          afterMinDuration(startedAt, () => {
            this.loading = false;
            this.messageService.add({
              severity: 'error',
              summary: 'ผิดพลาด',
              detail: 'โหลดข้อมูลไม่สำเร็จ: ' + (err.error?.message || err.message),
            });
          });
        },
      });
  }

  private daysFromNow(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  onFilterChange(): void {
    this.syncUrl();
    this.load();
  }

  clearFilters(): void {
    this.selectedProductId = null;
    this.showExpiringOnly = false;
    this.syncUrl();
    this.load();
  }

  totalRemaining(): number {
    return this.lots.reduce((sum, lot) => sum + Number(lot.quantity_remaining || 0), 0);
  }

  openCreateDialog(): void {
    this.isEditMode = false;
    this.editingLotId = null;
    this.form.get('product_id')?.enable();
    this.form.reset({ product_id: this.selectedProductId, use_pack: false });
    this.onFormProductChange();
    this.showDialog = true;
  }

  openEditDialog(lot: InventoryProductLot): void {
    if (lot.is_locked) {
      this.messageService.add({
        severity: 'warn',
        summary: 'แก้ไขไม่ได้',
        detail: 'ล็อตนี้มีเอกสารอ้างอิงแล้ว แก้ไขไม่ได้ — ให้ยกเลิกเอกสารที่เกี่ยวข้องแทน',
      });
      return;
    }

    this.isEditMode = true;
    this.editingLotId = lot.id ?? null;
    this.form.reset({
      product_id: lot.product_id,
      lot_no: lot.lot_no,
      manufacture_date: lot.manufacture_date || '',
      expiry_date: lot.expiry_date || '',
      package_id: lot.package_id ?? null,
      use_pack: !!lot.received_pack_qty && !!lot.package_id,
      quantity_in: lot.quantity_in,
      unit_cost: lot.unit_cost,
      received_pack_qty: lot.received_pack_qty,
      pack_unit_cost: null,
      supplier: lot.supplier || '',
      brand: lot.brand || '',
      note: lot.note || '',
    });
    // ห้ามย้าย lot ไปสินค้าอื่นตอนแก้ไข — ปิดไว้ (ค่าของ control ที่ disabled จะไม่ถูกส่งไปกับ form.value ด้วย)
    this.form.get('product_id')?.disable();
    this.showDialog = true;
  }

  closeDialog(): void {
    this.showDialog = false;
  }

  // สินค้าที่เลือกอยู่ใน dialog ตอนนี้ (getRawValue เพราะตอนแก้ไข product_id ถูก disable ไว้)
  selectedFormProduct(): InventoryProduct | undefined {
    const productId = this.form.getRawValue().product_id;
    return this.products.find((p) => p.id === productId);
  }

  // ยี่ห้อ/ขนาดบรรจุที่เลือกได้ — แบบที่ปิดใช้งานแล้วจะโชว์เฉพาะถ้าล็อตนี้ใช้อยู่เดิม
  packageOptions(): InventoryProductPackage[] {
    const currentId = this.form.get('package_id')?.value;
    return (this.selectedFormProduct()?.packages || []).filter((p) => p.is_active !== false || p.id === currentId);
  }

  packageLabel(pkg: InventoryProductPackage): string {
    const unit = this.selectedFormProduct()?.unit || 'หน่วย';
    return `${pkg.brand} — 1 ${pkg.pack_unit} = ${pkg.pack_size} ${unit}`;
  }

  selectedPackage(): InventoryProductPackage | undefined {
    const packageId = this.form.get('package_id')?.value;
    return this.selectedFormProduct()?.packages?.find((p) => p.id === packageId);
  }

  // เปลี่ยนสินค้า → เลือกยี่ห้อที่ซื้อประจำให้อัตโนมัติ
  onFormProductChange(): void {
    const options = this.packageOptions();
    const pkg = options.find((p) => p.is_default) || (options.length === 1 ? options[0] : undefined);
    this.form.patchValue({ package_id: pkg?.id ?? null });
    this.onPackageChange();
  }

  onPackageChange(): void {
    const pkg = this.selectedPackage();
    this.form.patchValue({
      use_pack: !!pkg,
      pack_unit_cost: pkg?.last_pack_cost != null ? Number(pkg.last_pack_cost) : null,
    });
  }

  packQty(): number {
    return Number(this.form.get('received_pack_qty')?.value) || 0;
  }

  packTotalUnits(): number {
    return this.packQty() * (this.selectedPackage()?.pack_size || 0);
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.messageService.add({ severity: 'warn', summary: 'แจ้งเตือน', detail: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
      return;
    }

    const { use_pack, quantity_in, unit_cost, received_pack_qty, pack_unit_cost, ...rest } = this.form.value;

    if (use_pack && !received_pack_qty) {
      this.messageService.add({ severity: 'warn', summary: 'แจ้งเตือน', detail: 'กรุณากรอกจำนวนที่รับเข้า' });
      return;
    }
    if (!use_pack && !quantity_in) {
      this.messageService.add({ severity: 'warn', summary: 'แจ้งเตือน', detail: 'กรุณากรอกจำนวนที่รับเข้า' });
      return;
    }

    // เลือกยี่ห้อแล้ว brand มาจาก package — ไม่ต้องส่ง brand ที่พิมพ์เอง
    if (rest.package_id) delete rest.brand;
    const payload: Partial<InventoryProductLot> = use_pack
      ? { ...rest, received_pack_qty, pack_unit_cost }
      : { ...rest, quantity_in, unit_cost };

    this.saving = true;
    const request$ =
      this.isEditMode && this.editingLotId
        ? this.inventoryService.updateLot(this.editingLotId, payload)
        : this.inventoryService.createLot(payload as InventoryProductLot);

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.showDialog = false;
        this.messageService.add({
          severity: 'success',
          summary: 'สำเร็จ',
          detail: this.isEditMode ? 'แก้ไขล็อตเรียบร้อยแล้ว' : 'รับสินค้าเข้าล็อตเรียบร้อยแล้ว',
        });
        this.load();
      },
      error: (err) => {
        this.saving = false;
        this.messageService.add({
          severity: 'error',
          summary: 'ผิดพลาด',
          detail: 'บันทึกไม่สำเร็จ: ' + (err.error?.message || err.message),
        });
      },
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  productName(productId: number): string {
    return this.products.find((p) => p.id === productId)?.name || `#${productId}`;
  }

  isExpiringSoon(lot: InventoryProductLot): boolean {
    if (!lot.expiry_date) return false;
    const days = (new Date(lot.expiry_date).getTime() - Date.now()) / 86400000;
    return days <= 30 && days >= 0;
  }

  isExpired(lot: InventoryProductLot): boolean {
    if (!lot.expiry_date) return false;
    return new Date(lot.expiry_date).getTime() < Date.now();
  }

  formatDate(date?: string): string {
    if (!date) return '-';
    return new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date));
  }

  formatCurrency(amount?: number): string {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
  }

  // numeric จาก Postgres มาเป็น string ("220.00") — แปลงก่อนคำนวณ/เปรียบเทียบ
  num(value: unknown): number {
    return Number(value) || 0;
  }

  // % คงเหลือเทียบกับที่รับเข้า ใช้วาดแถบคงเหลือ
  remainingPercent(lot: InventoryProductLot): number {
    const total = this.num(lot.quantity_in);
    if (!total) return 0;
    return Math.max(0, Math.min(100, Math.round((this.num(lot.quantity_remaining) / total) * 100)));
  }

  daysToExpiry(lot: InventoryProductLot): number {
    if (!lot.expiry_date) return 0;
    return Math.ceil((new Date(lot.expiry_date).getTime() - Date.now()) / 86400000);
  }

  // รับเข้าเป็นหน่วยบรรจุ เช่น "3 กล่อง × 100" (ใช้ pack_unit/pack_size ที่ snapshot ไว้ที่ล็อต ไม่ใช่ของ package ปัจจุบัน)
  receivedPackLine(lot: InventoryProductLot): string | null {
    if (!lot.received_pack_qty || !lot.pack_unit) return null;
    return `${this.num(lot.received_pack_qty)} ${lot.pack_unit} × ${lot.pack_size}`;
  }

  editHistoryTooltip(lot: InventoryProductLot): string {
    if (!lot.modify_date) return '';
    return `แก้ไขล่าสุดโดย ${lot.modify_by || 'ไม่ทราบ'} เมื่อ ${this.formatDate(lot.modify_date)}`;
  }
}
