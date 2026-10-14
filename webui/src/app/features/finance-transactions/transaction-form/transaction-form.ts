import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { LoadingSpinnerComponent } from '../../../ui/loading-spinner/loading-spinner';
import { afterMinDuration } from '../../../core/utils/min-duration';
import { FinanceTransactionService } from '../../../core/services/finance-transaction.service';
import { InventoryService } from '../../../core/services/inventory.service';
import { PatientService } from '../../../core/services/patient.service';
import { InventoryProduct, InventoryProductLot } from '../../../core/models/inventory.model';
import { CreateFinanceTransactionPayload, FinanceTransactionItem } from '../../../core/models/finance-transaction.model';
import { Patient } from '../../../models/users/user.model';

@Component({
  selector: 'app-transaction-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    ToastModule,
    LoadingSpinnerComponent,
  ],
  templateUrl: './transaction-form.html',
  styleUrls: ['./transaction-form.scss'],
  providers: [MessageService],
})
export class TransactionFormComponent implements OnInit {
  form: FormGroup;
  saving = false;
  products: InventoryProduct[] = [];
  lotsByProduct: Record<number, InventoryProductLot[]> = {};
  patients: Patient[] = [];

  docTypeOptions = [
    // { label: '🛒 ขายสินค้า', value: 'sale' },
    { label: '🩺 บริการคนไข้', value: 'patient_service' },
    { label: '📦 ซื้อของเข้าสต็อก', value: 'purchase' },
    { label: '💰 รายรับทั่วไป', value: 'income' },
    { label: '💸 รายจ่ายทั่วไป', value: 'expense' },
    // { label: 'ผสม (รับ + จ่าย)', value: 'mixed' },
  ];

  directionOptions = [
    { label: 'รับเงิน', value: 'in' },
    { label: 'จ่ายเงิน', value: 'out' },
  ];

  itemTypeOptions = [
    { label: 'สินค้า', value: 'product' },
    { label: 'บริการ', value: 'service' },
    { label: 'อื่นๆ', value: 'other' },
  ];

  // บริการที่เกี่ยวกับคนไข้ซึ่งใช้บ่อย — เลือกจาก select แทนพิมพ์เองเพื่อให้หมวดหมู่ตรงกันทุกเอกสาร
  // เก็บเป็นข้อความไทยตรงๆ ใน category (เหมือนตอนพิมพ์เอง) เพื่อให้หน้ารายละเอียด/รายการแสดงผลได้ทันทีโดยไม่ต้อง map code กลับเป็นข้อความ
  serviceCategoryOptions = ['ล้างแผล', 'ทำแผล', 'ฉีดยา', 'เจาะเลือด', 'วัดความดัน', 'พ่นยา', 'ให้น้ำเกลือ', 'ค่าตรวจรักษา', 'ค่าบริการอื่นๆ'];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private messageService: MessageService,
    private financeTransactionService: FinanceTransactionService,
    private inventoryService: InventoryService,
    private patientService: PatientService,
  ) {
    this.form = this.fb.group({
      doc_type: ['sale', Validators.required],
      doc_date: [this.today(), Validators.required],
      note: [''],
      patient_id: [null],
      items: this.fb.array([this.createItemGroup()]),
    });
  }

  ngOnInit(): void {
    this.inventoryService.getProducts({ limit: 200 }).subscribe({
      next: (res) => {
        this.products = res.data;
      },
    });
    this.patientService.getPatients().subscribe({
      next: (patients) => {
        this.patients = patients;
      },
    });
  }

  get isPatientServiceDoc(): boolean {
    return this.form.get('doc_type')?.value === 'patient_service';
  }

  get patientOptions(): { label: string; value: number }[] {
    return this.patients.map((p) => ({
      label: `${p.patient_code} - ${p.first_name} ${p.last_name}`,
      value: p.id!,
    }));
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  get items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  itemGroup(index: number): FormGroup {
    return this.items.at(index) as FormGroup;
  }

  private createItemGroup(): FormGroup {
    return this.fb.group({
      direction: ['in', Validators.required],
      item_type: ['other', Validators.required],
      category: [''],
      product_id: [null],
      product_lot_id: [null],
      is_new_lot: [false],
      new_lot_no: [''],
      new_lot_expiry: [''],
      quantity: [null],
      unit_price: [null],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      description: [''],
    });
  }

  addItem(): void {
    this.items.push(this.createItemGroup());
  }

  removeItem(index: number): void {
    if (this.items.length === 1) return;
    this.items.removeAt(index);
  }

  onProductChange(index: number): void {
    const group = this.itemGroup(index);
    const productId = group.get('product_id')?.value;
    group.patchValue({ product_lot_id: null });
    if (!productId || this.lotsByProduct[productId]) return;

    this.inventoryService.getLots({ product_id: productId, limit: 50 }).subscribe({
      next: (res) => {
        this.lotsByProduct[productId] = res.data;
      },
    });
  }

  lotsFor(index: number): InventoryProductLot[] {
    const productId = this.itemGroup(index).get('product_id')?.value;
    return productId ? this.lotsByProduct[productId] || [] : [];
  }

  recalcAmount(index: number): void {
    const group = this.itemGroup(index);
    const quantity = Number(group.get('quantity')?.value) || 0;
    const unitPrice = Number(group.get('unit_price')?.value) || 0;
    if (quantity > 0 && unitPrice > 0) {
      group.patchValue({ amount: Math.round(quantity * unitPrice * 100) / 100 });
    }
  }

  get totalIn(): number {
    return this.items.controls
      .filter((c) => c.get('direction')?.value === 'in')
      .reduce((sum, c) => sum + (Number(c.get('amount')?.value) || 0), 0);
  }

  get totalOut(): number {
    return this.items.controls
      .filter((c) => c.get('direction')?.value === 'out')
      .reduce((sum, c) => sum + (Number(c.get('amount')?.value) || 0), 0);
  }

  get netAmount(): number {
    return this.totalIn - this.totalOut;
  }

  isFieldInvalid(controlName: string): boolean {
    const field = this.form.get(controlName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  isItemFieldInvalid(index: number, controlName: string): boolean {
    const field = this.itemGroup(index).get(controlName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  submit(): void {
    if (this.saving) return;

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.messageService.add({ severity: 'warn', summary: 'แจ้งเตือน', detail: 'กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง' });
      return;
    }

    const value = this.form.value;
    if (value.doc_type === 'patient_service' && !value.patient_id) {
      this.messageService.add({ severity: 'warn', summary: 'แจ้งเตือน', detail: 'กรุณาเลือกคนไข้สำหรับเอกสารบริการคนไข้' });
      return;
    }

    const payload: CreateFinanceTransactionPayload = {
      doc_type: value.doc_type,
      doc_date: value.doc_date,
      note: value.note || undefined,
      patient_id: value.doc_type === 'patient_service' ? value.patient_id : undefined,
      items: value.items.map((item: Record<string, unknown>) => this.toItemPayload(item)),
    };

    this.saving = true;
    const startedAt = Date.now();
    this.financeTransactionService.createTransaction(payload).subscribe({
      next: (res) => {
        afterMinDuration(startedAt, () => {
          this.saving = false;
          this.router.navigate(['/finance-transactions', res.data.id], {
            state: {
              toast: { severity: 'success', summary: 'สำเร็จ', detail: `สร้างเอกสาร ${res.data.doc_no} เรียบร้อยแล้ว` },
            },
          });
        });
      },
      error: (err) => {
        afterMinDuration(startedAt, () => {
          this.saving = false;
          this.messageService.add({
            severity: 'error',
            summary: 'เกิดข้อผิดพลาด',
            detail: err.error?.message || err.message,
          });
        });
      },
    });
  }

  private toItemPayload(item: Record<string, unknown>): FinanceTransactionItem {
    const payload: FinanceTransactionItem = {
      direction: item['direction'] as FinanceTransactionItem['direction'],
      item_type: item['item_type'] as FinanceTransactionItem['item_type'],
      category: (item['category'] as string) || undefined,
      amount: item['amount'] as number,
      description: (item['description'] as string) || undefined,
    };

    if (item['item_type'] === 'product' && item['product_id']) {
      payload.product_id = item['product_id'] as number;
      payload.quantity = item['quantity'] as number;
      payload.unit_price = item['unit_price'] as number;

      if (item['direction'] === 'in' && item['is_new_lot']) {
        payload.new_lot = {
          lot_no: item['new_lot_no'] as string,
          expiry_date: (item['new_lot_expiry'] as string) || undefined,
        };
      } else if (item['product_lot_id']) {
        payload.product_lot_id = item['product_lot_id'] as number;
      }
    }

    return payload;
  }

  onCancel(): void {
    this.router.navigate(['/finance-transactions/list']);
  }
}
