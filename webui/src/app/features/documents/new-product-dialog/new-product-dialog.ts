import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';

import { InventoryService } from '../../../core/services/inventory.service';
import { InventoryProduct, InventoryProductCategory } from '../../../core/models/inventory.model';

export interface NewProductResult {
  product: InventoryProduct;
  // ยี่ห้อที่เพิ่งสร้าง (null = รับเป็นหน่วยย่อย)
  packageId: number | null;
}

// สร้างสินค้าใหม่ / เพิ่มยี่ห้อ-ขนาดบรรจุให้สินค้าเดิม จากหน้ารับของเข้า — บันทึกลงคลังทันที แล้วส่งผลกลับไปเติมในแถวของตาราง
//   mode 'product' : สินค้าใหม่ (+ ยี่ห้อ/ขนาดบรรจุแรก ถ้าซื้อเป็นกล่อง/แผง)
//   mode 'package' : ยี่ห้อ/ขนาดบรรจุใหม่ ของ product ที่ส่งมา
@Component({
  selector: 'app-new-product-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, InputNumberModule],
  templateUrl: './new-product-dialog.html',
  styleUrls: ['./new-product-dialog.scss'],
})
export class NewProductDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() mode: 'product' | 'package' = 'product';
  @Input() product: InventoryProduct | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<NewProductResult>();

  readonly unitChips = ['เม็ด', 'แคปซูล', 'ขวด', 'ชิ้น', 'ซอง', 'หลอด', 'คู่', 'ม้วน', 'ชุด'];
  readonly packUnitChips = ['กล่อง', 'แผง', 'ขวด', 'ลัง', 'ห่อ', 'แพ็ค'];
  readonly categoryOptions: { value: InventoryProductCategory; label: string }[] = [
    { value: 'medicine', label: 'ยา' },
    { value: 'supply', label: 'เวชภัณฑ์' },
    { value: 'other', label: 'อื่นๆ' },
  ];

  saving = false;
  error = '';

  name = '';
  category: InventoryProductCategory = 'medicine';
  unit = 'เม็ด';
  sellPrice: number | null = null;

  // ยี่ห้อ/ขนาดบรรจุ — mode product: ไม่บังคับ (hasPack), mode package: บังคับ
  hasPack = true;
  brand = '';
  packUnit = 'กล่อง';
  packSize: number | null = null;
  isDefault = true;

  constructor(private inventoryService: InventoryService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['visible'] || !this.visible) return;
    this.error = '';
    this.name = '';
    this.category = 'medicine';
    this.unit = 'เม็ด';
    this.sellPrice = null;
    this.hasPack = true;
    this.brand = '';
    this.packUnit = 'กล่อง';
    this.packSize = null;
    this.isDefault = this.mode === 'product' || !(this.product?.packages || []).some((p) => p.is_active !== false);
  }

  get title(): string {
    return this.mode === 'product' ? 'สินค้าใหม่' : `ยี่ห้อ / ขนาดใหม่ — ${this.product?.name ?? ''}`;
  }

  get baseUnit(): string {
    return (this.mode === 'product' ? this.unit : this.product?.unit) || 'หน่วย';
  }

  get packValid(): boolean {
    return !!this.brand.trim() && !!this.packUnit.trim() && Number(this.packSize) > 0;
  }

  close(): void {
    this.visibleChange.emit(false);
  }

  submit(): void {
    this.error = '';
    if (this.mode === 'product') {
      if (!this.name.trim() || !this.unit.trim()) {
        this.error = 'กรอกชื่อสินค้าและหน่วยที่จ่าย';
        return;
      }
      if (this.hasPack && !this.packValid) {
        this.error = 'กรอกยี่ห้อ หน่วยซื้อ และจำนวนต่อหน่วยซื้อ — หรือปิด "ซื้อเป็นกล่อง/แผง"';
        return;
      }
      this.saveProduct();
    } else {
      if (!this.packValid) {
        this.error = 'กรอกยี่ห้อ หน่วยซื้อ และจำนวนต่อหน่วยซื้อ';
        return;
      }
      this.savePackage();
    }
  }

  private newPackagePayload() {
    return {
      brand: this.brand.trim(),
      pack_unit: this.packUnit.trim(),
      pack_size: Number(this.packSize),
      is_default: this.isDefault,
    };
  }

  private saveProduct(): void {
    const pkg = this.hasPack ? this.newPackagePayload() : null;
    this.saving = true;
    this.inventoryService
      .createProduct({
        name: this.name.trim(),
        category: this.category,
        unit: this.unit.trim(),
        ...(this.sellPrice != null ? { sell_price: this.sellPrice } : {}),
        packages: pkg ? [{ ...pkg, is_default: true }] : [],
      } as InventoryProduct)
      .subscribe({
        next: (res) => this.finish(res.data, pkg),
        error: (err) => this.fail(err),
      });
  }

  // backend sync packages ทั้งชุด — ต้องส่งของเดิมทุกตัว (รวมที่ปิดใช้งาน) ไปพร้อมตัวใหม่
  private savePackage(): void {
    const product = this.product!;
    const pkg = this.newPackagePayload();
    const existing = (product.packages || []).map((p) => ({
      id: p.id,
      brand: p.brand,
      pack_unit: p.pack_unit,
      pack_size: p.pack_size,
      ...(p.barcode ? { barcode: p.barcode } : {}),
      ...(p.description ? { description: p.description } : {}),
      ...(p.note ? { note: p.note } : {}),
      ...(p.last_pack_cost != null ? { last_pack_cost: Number(p.last_pack_cost) } : {}),
      is_default: pkg.is_default ? false : !!p.is_default,
      is_active: p.is_active !== false,
    }));
    this.saving = true;
    this.inventoryService.updateProduct(product.id!, { packages: [...existing, pkg] } as Partial<InventoryProduct>).subscribe({
      next: (res) => this.finish(res.data, pkg),
      error: (err) => this.fail(err),
    });
  }

  private finish(product: InventoryProduct, pkg: { brand: string; pack_unit: string; pack_size: number } | null): void {
    this.saving = false;
    const created = pkg
      ? product.packages?.find((p) => p.brand === pkg.brand && p.pack_unit === pkg.pack_unit && p.pack_size === pkg.pack_size)
      : undefined;
    this.saved.emit({ product, packageId: created?.id ?? null });
    this.close();
  }

  private fail(err: any): void {
    this.saving = false;
    const msg = err?.error?.message;
    this.error = Array.isArray(msg) ? msg.join(', ') : msg || 'บันทึกไม่สำเร็จ';
  }
}
