import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { LoadingSpinnerComponent } from '../../../ui/loading-spinner/loading-spinner';
import { InventoryTabsComponent } from '../inventory-tabs/inventory-tabs';
import { afterMinDuration } from '../../../core/utils/min-duration';
import { InventoryService } from '../../../core/services/inventory.service';
import {
  InventoryProduct,
  InventoryProductCategory,
  InventoryProductPackage,
} from '../../../core/models/inventory.model';

@Component({
  selector: 'app-product-list',
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
    ConfirmDialogModule,
    TooltipModule,
    LoadingSpinnerComponent,
    InventoryTabsComponent,
  ],
  templateUrl: './product-list.html',
  styleUrls: ['../../../ui/styles/list-page.scss', './product-list.scss'],
  providers: [MessageService, ConfirmationService],
})
export class ProductListComponent implements OnInit {
  products: InventoryProduct[] = [];
  loading = false;
  saving = false;
  showDialog = false;
  isEditMode = false;
  editingProductId: number | null = null;

  searchTerm = '';
  selectedCategory = '';

  form: FormGroup;

  filterCategoryOptions = [
    { label: 'ทุกประเภท', value: '' },
    { label: '💊 ยา', value: 'medicine' },
    { label: '🩹 เวชภัณฑ์', value: 'supply' },
    { label: 'อื่นๆ', value: 'other' },
  ];

  formCategoryOptions = [
    { label: '💊 ยา', value: 'medicine' },
    { label: '🩹 เวชภัณฑ์', value: 'supply' },
    { label: 'อื่นๆ', value: 'other' },
  ];

  dosageFormOptions = [
    { label: 'เม็ด (tablet)', value: 'tablet' },
    { label: 'แคปซูล (capsule)', value: 'capsule' },
    { label: 'น้ำ (syrup/solution)', value: 'syrup' },
    { label: 'ผง (powder)', value: 'powder' },
    { label: 'ฉีด (injection)', value: 'injection' },
    { label: 'ครีม/ขี้ผึ้ง (cream)', value: 'cream' },
    { label: 'หยอด (drops)', value: 'drops' },
    { label: 'ภายนอก (external)', value: 'external' },
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private inventoryService: InventoryService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) {
    this.form = this.fb.group({
      sku: [''],
      name: ['', Validators.required],
      generic_name: [''],
      strength: [''],
      dosage_form: [null],
      category: ['medicine', Validators.required],
      unit: ['', Validators.required],
      sell_price: [null],
      reorder_level: [null],
      description: [''],
      is_active: [true],
      packages: this.fb.array([]),
    });
  }

  get packages(): FormArray {
    return this.form.get('packages') as FormArray;
  }

  packageGroup(index: number): FormGroup {
    return this.packages.at(index) as FormGroup;
  }

  private buildPackageGroup(pkg?: InventoryProductPackage): FormGroup {
    return this.fb.group({
      id: [pkg?.id ?? null],
      brand: [pkg?.brand ?? '', Validators.required],
      pack_unit: [pkg?.pack_unit ?? 'กล่อง', Validators.required],
      pack_size: [pkg?.pack_size ?? null, [Validators.required, Validators.min(1)]],
      // บาร์โค้ดไม่แสดงในตารางแล้ว แต่เก็บค่าเดิมไว้ส่งกลับ ไม่ให้หายตอนบันทึก
      barcode: [pkg?.barcode ?? ''],
      description: [pkg?.description ?? ''],
      note: [pkg?.note ?? ''],
      last_pack_cost: [pkg?.last_pack_cost != null ? Number(pkg.last_pack_cost) : null],
      is_default: [pkg?.is_default ?? false],
      is_active: [pkg?.is_active ?? true],
    });
  }

  addPackage(): void {
    const group = this.buildPackageGroup();
    // แบบแรกตั้งเป็นแบบซื้อประจำให้เลย
    if (this.packages.length === 0) group.patchValue({ is_default: true });
    this.packages.push(group);
  }

  removePackage(index: number): void {
    this.packages.removeAt(index);
  }

  // ซื้อประจำได้แค่แบบเดียว — ติ๊กอันหนึ่งแล้วเคลียร์อันอื่น
  setDefaultPackage(index: number): void {
    this.packages.controls.forEach((c, i) => c.patchValue({ is_default: i === index }, { emitEvent: false }));
  }

  private resetPackages(packages: InventoryProductPackage[] = []): void {
    this.packages.clear();
    packages.forEach((p) => this.packages.push(this.buildPackageGroup(p)));
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    const startedAt = Date.now();
    this.inventoryService
      .getProducts({
        search: this.searchTerm || undefined,
        category: (this.selectedCategory || undefined) as InventoryProductCategory | undefined,
        limit: 100,
      })
      .subscribe({
        next: (res) => {
          afterMinDuration(startedAt, () => {
            this.products = res.data;
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

  onSearch(): void {
    this.load();
  }

  onFilterChange(): void {
    this.load();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = '';
    this.load();
  }

  openCreateDialog(): void {
    this.isEditMode = false;
    this.editingProductId = null;
    this.form.reset({ category: 'medicine', unit: 'เม็ด', description: '', is_active: true });
    this.resetPackages();
    this.showDialog = true;
  }

  openEditDialog(product: InventoryProduct): void {
    this.isEditMode = true;
    this.editingProductId = product.id ?? null;
    this.form.reset({
      sku: product.sku || '',
      name: product.name,
      generic_name: product.generic_name || '',
      strength: product.strength || '',
      dosage_form: product.dosage_form || null,
      category: product.category,
      unit: product.unit || '',
      sell_price: product.sell_price != null ? Number(product.sell_price) : null,
      reorder_level: product.reorder_level != null ? Number(product.reorder_level) : null,
      description: product.description || '',
      is_active: product.is_active ?? true,
    });
    this.resetPackages(product.packages || []);
    this.showDialog = true;
  }

  closeDialog(): void {
    this.showDialog = false;
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.messageService.add({ severity: 'warn', summary: 'แจ้งเตือน', detail: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
      return;
    }

    const { packages, ...rest } = this.form.value;

    // ส่ง packages ครบทุกแบบเสมอ — backend จะเพิ่ม/แก้/ลบให้ตรงกับรายการนี้
    // id = null ต้องตัดทิ้ง (ไม่งั้น class-validator มองว่าส่ง id มาแต่ไม่ใช่ตัวเลข)
    const payload = {
      ...rest,
      // SKU ว่าง = ไม่มี SKU (null) — ส่ง '' แล้วจะชน unique constraint กับสินค้าอื่นที่ SKU ว่างเหมือนกัน
      sku: rest.sku?.trim() || null,
      dosage_form: rest.dosage_form || null,
      packages: (packages as InventoryProductPackage[]).map(({ id, barcode, last_pack_cost, ...p }) => ({
        ...p,
        ...(id ? { id } : {}),
        ...(barcode ? { barcode } : {}),
        ...(last_pack_cost != null ? { last_pack_cost } : {}),
      })),
    } as InventoryProduct;

    this.saving = true;
    const request$ =
      this.isEditMode && this.editingProductId
        ? this.inventoryService.updateProduct(this.editingProductId, payload)
        : this.inventoryService.createProduct(payload);

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.showDialog = false;
        this.messageService.add({
          severity: 'success',
          summary: 'สำเร็จ',
          detail: this.isEditMode ? 'อัปเดตสินค้าเรียบร้อยแล้ว' : 'เพิ่มสินค้าเรียบร้อยแล้ว',
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

  // ลบสินค้าที่สร้างผิด/ไม่ใช้ — backend ยอมเมื่อไม่มีสต็อกเหลือและไม่อยู่ในเอกสารที่ใช้งาน (ไม่งั้นแจ้งเหตุผล)
  confirmDelete(product: InventoryProduct): void {
    this.confirmationService.confirm({
      header: 'ลบสินค้า',
      message: `ลบ "${product.name}" ออกจากคลังใช่หรือไม่? ล็อตและประวัติสต็อกของสินค้านี้จะถูกลบด้วย (ลบได้เมื่อไม่มีสต็อกเหลือ และไม่อยู่ในเอกสารที่ยังใช้งาน)`,
      icon: 'pi pi-trash',
      rejectButtonProps: { label: 'ไม่ลบ', severity: 'secondary', outlined: true },
      acceptButtonProps: { label: 'ลบสินค้า', severity: 'danger' },
      accept: () => {
        this.inventoryService.deleteProduct(product.id!).subscribe({
          next: (res) => {
            this.messageService.add({ severity: 'success', summary: 'ลบแล้ว', detail: res.message });
            this.load();
          },
          error: (err) =>
            this.messageService.add({
              severity: 'warn',
              summary: 'ลบไม่ได้',
              detail: err.error?.message || err.message,
              life: 6000,
            }),
        });
      },
    });
  }

  viewLots(product: InventoryProduct): void {
    this.showPackagesDialog = false;
    this.router.navigate(['/inventory/lots'], { queryParams: { product_id: product.id } });
  }

  // รับของเข้า = ทำเอกสาร RCV (มีเลขที่เอกสาร + ลงบัญชีรายจ่าย) โดยเติมสินค้า/ยี่ห้อให้ในบรรทัดแรก
  receive(product: InventoryProduct, packageId?: number): void {
    this.showPackagesDialog = false;
    this.router.navigate(['/documents/new'], {
      queryParams: { type: 'receive', product_id: product.id, ...(packageId ? { package_id: packageId } : {}) },
    });
  }

  // ----- modal ยี่ห้อ/ขนาดบรรจุ (ดูอย่างเดียว — แก้ผ่านปุ่มแก้ไขสินค้า) -----
  showPackagesDialog = false;
  packagesProduct: InventoryProduct | null = null;

  openPackagesDialog(product: InventoryProduct): void {
    this.packagesProduct = product;
    this.showPackagesDialog = true;
  }

  editFromPackagesDialog(): void {
    if (!this.packagesProduct) return;
    this.showPackagesDialog = false;
    this.openEditDialog(this.packagesProduct);
  }

  defaultPackage(product: InventoryProduct): InventoryProductPackage | undefined {
    const active = this.activePackages(product);
    return active.find((p) => p.is_default) || active[0];
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  activePackages(product: InventoryProduct): InventoryProductPackage[] {
    return (product.packages || []).filter((p) => p.is_active !== false);
  }

  isLowStock(product: InventoryProduct): boolean {
    return product.reorder_level != null && Number(product.stock_remaining ?? 0) <= Number(product.reorder_level);
  }

  // แปลงคงเหลือเป็นหน่วยบรรจุแบบประจำ เช่น "250 เม็ด ≈ 5 กล่อง" ให้นับของง่าย
  stockInPacks(product: InventoryProduct): string | null {
    const pkg = this.defaultPackage(product);
    const stock = Number(product.stock_remaining ?? 0);
    if (!pkg || !stock || pkg.pack_size <= 1) return null;
    const packs = Math.floor(stock / pkg.pack_size);
    const rest = stock % pkg.pack_size;
    return `≈ ${packs} ${pkg.pack_unit}${rest ? ` + ${rest} ${product.unit || ''}` : ''}`;
  }

  // หมดเกลี้ยง — แยกจาก "ใกล้หมด" เพราะต้องรีบจัดการกว่า (สินค้าที่ไม่ได้ตั้ง reorder_level ก็ยังเตือนได้)
  isOutOfStock(product: InventoryProduct): boolean {
    return product.is_active !== false && Number(product.stock_remaining ?? 0) <= 0;
  }

  categoryLabel(category: string): string {
    switch (category) {
      case 'medicine':
        return 'ยา';
      case 'supply':
        return 'เวชภัณฑ์';
      default:
        return 'อื่นๆ';
    }
  }

  categoryChipClass(category: string): string {
    return category === 'medicine' ? 'chip-accent' : category === 'supply' ? 'chip-info' : '';
  }
}
