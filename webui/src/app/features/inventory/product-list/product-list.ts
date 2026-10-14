import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

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
import { InventoryProduct, InventoryProductCategory } from '../../../core/models/inventory.model';

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
    TagModule,
    ToastModule,
    TooltipModule,
    LoadingSpinnerComponent,
  ],
  templateUrl: './product-list.html',
  styleUrls: ['./product-list.scss'],
  providers: [MessageService],
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

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private inventoryService: InventoryService,
    private messageService: MessageService,
  ) {
    this.form = this.fb.group({
      sku: [''],
      name: ['', Validators.required],
      category: ['medicine', Validators.required],
      unit: [''],
      has_pack: [false],
      pack_unit: [''],
      pack_size: [null],
      description: [''],
      is_active: [true],
    });
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
    this.form.reset({ category: 'medicine', has_pack: false, description: '', is_active: true });
    this.showDialog = true;
  }

  openEditDialog(product: InventoryProduct): void {
    this.isEditMode = true;
    this.editingProductId = product.id ?? null;
    this.form.reset({
      sku: product.sku || '',
      name: product.name,
      category: product.category,
      unit: product.unit || '',
      has_pack: !!product.pack_unit,
      pack_unit: product.pack_unit || '',
      pack_size: product.pack_size ?? null,
      description: product.description || '',
      is_active: product.is_active ?? true,
    });
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

    const { has_pack, pack_unit, pack_size, ...rest } = this.form.value;
    if (has_pack && (!pack_unit || !pack_size)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'แจ้งเตือน',
        detail: 'กรุณากรอกหน่วยบรรจุและจำนวนต่อแพ็คให้ครบ',
      });
      return;
    }

    // ส่ง null (ไม่ใช่ undefined) ตอนปิด has_pack เพื่อให้ backend เคลียร์ค่าเดิมทิ้งตอนแก้ไข
    // (undefined จะถูก JSON.stringify ตัดคีย์ทิ้งไปเลย ทำให้ backend เข้าใจว่า "ไม่ได้ส่งมา" ไม่ใช่ "ให้ล้างค่า")
    const payload = {
      ...rest,
      pack_unit: has_pack ? pack_unit : null,
      pack_size: has_pack ? pack_size : null,
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

  viewLots(product: InventoryProduct): void {
    this.router.navigate(['/inventory/lots'], { queryParams: { product_id: product.id } });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  categoryLabel(category: string): string {
    switch (category) {
      case 'medicine':
        return '💊 ยา';
      case 'supply':
        return '🩹 เวชภัณฑ์';
      default:
        return 'อื่นๆ';
    }
  }
}
