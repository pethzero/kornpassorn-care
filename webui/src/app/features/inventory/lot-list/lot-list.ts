import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

import { LoadingSpinnerComponent } from '../../../ui/loading-spinner/loading-spinner';
import { afterMinDuration } from '../../../core/utils/min-duration';
import { InventoryService } from '../../../core/services/inventory.service';
import { InventoryProduct, InventoryProductLot } from '../../../core/models/inventory.model';

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
    TagModule,
    ToastModule,
    TooltipModule,
    LoadingSpinnerComponent,
  ],
  templateUrl: './lot-list.html',
  styleUrls: ['./lot-list.scss'],
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
    private inventoryService: InventoryService,
    private messageService: MessageService,
  ) {
    this.form = this.fb.group({
      product_id: [null, Validators.required],
      lot_no: ['', Validators.required],
      manufacture_date: [''],
      expiry_date: [''],
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
    const qpProductId = this.route.snapshot.queryParamMap.get('product_id');
    if (qpProductId) this.selectedProductId = Number(qpProductId);

    this.loadProducts();
    this.load();
  }

  loadProducts(): void {
    this.inventoryService.getProducts({ limit: 200 }).subscribe({
      next: (res) => {
        this.products = res.data;
      },
    });
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
    this.load();
  }

  clearFilters(): void {
    this.selectedProductId = null;
    this.showExpiringOnly = false;
    this.load();
  }

  openCreateDialog(): void {
    this.isEditMode = false;
    this.editingLotId = null;
    this.form.get('product_id')?.enable();
    this.form.reset({ product_id: this.selectedProductId, use_pack: false });
    this.showDialog = true;
  }

  openEditDialog(lot: InventoryProductLot): void {
    if (lot.is_locked) {
      this.messageService.add({
        severity: 'warn',
        summary: 'แก้ไขไม่ได้',
        detail: 'ล็อตนี้มีรายการการเงินอ้างอิงแล้ว ไม่สามารถแก้ไขได้',
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
      use_pack: !!lot.received_pack_qty,
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

  // สินค้าที่เลือกอยู่ใน dialog ตอนนี้ — ใช้เช็คว่ามี pack_unit/pack_size ให้สลับโหมดกรอกเป็นแพ็คได้ไหม
  selectedFormProduct(): InventoryProduct | undefined {
    const productId = this.form.get('product_id')?.value;
    return this.products.find((p) => p.id === productId);
  }

  productHasPack(): boolean {
    const product = this.selectedFormProduct();
    return !!(product?.pack_unit && product?.pack_size);
  }

  onFormProductChange(): void {
    if (!this.productHasPack()) {
      this.form.patchValue({ use_pack: false });
    }
  }

  packQty(): number {
    return Number(this.form.get('received_pack_qty')?.value) || 0;
  }

  packTotalUnits(): number {
    const product = this.selectedFormProduct();
    return this.packQty() * (product?.pack_size || 0);
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

  receivedDisplay(lot: InventoryProductLot): string {
    const unit = lot.product?.unit || '';
    if (lot.received_pack_qty && lot.product?.pack_unit) {
      return `${lot.received_pack_qty} ${lot.product.pack_unit} (${lot.quantity_in} ${unit})`;
    }
    return `${lot.quantity_in} ${unit}`;
  }

  // แยกบรรทัดบน/ล่างสำหรับแสดงสัดส่วนหน่วยบรรจุ -> หน่วยย่อยแบบตารางย่อในคอลัมน์ "รับเข้า"
  receivedPackLine(lot: InventoryProductLot): string | null {
    if (!lot.received_pack_qty || !lot.product?.pack_unit) return null;
    return `${lot.received_pack_qty} ${lot.product.pack_unit}`;
  }

  receivedUnitLine(lot: InventoryProductLot): string {
    const unit = lot.product?.unit || '';
    return `= ${lot.quantity_in} ${unit}`;
  }

  editHistoryTooltip(lot: InventoryProductLot): string {
    if (!lot.modify_date) return '';
    return `แก้ไขล่าสุดโดย ${lot.modify_by || 'ไม่ทราบ'} เมื่อ ${this.formatDate(lot.modify_date)}`;
  }
}
