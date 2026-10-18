import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';

import { FinanceService } from '../../../core/services/finance.service';
import { FinanceRecord } from '../../../core/models/finance.model';

// บันทึกรายรับ/รายจ่ายที่ไม่มีเอกสาร (ค่าไฟ ค่าเช่า เงินเดือน ...) — ใช้แทนหน้า /finance/form เดิม
// ซื้อยา/เวชภัณฑ์ หรือรับเงินค่าบริการคนไข้ ให้ทำเป็นเอกสารแทน เพื่อให้สต็อกกับเงินตรงกัน
@Component({
  selector: 'app-finance-record-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, DialogModule, InputTextModule, InputNumberModule],
  templateUrl: './finance-record-dialog.html',
  styleUrls: ['./finance-record-dialog.scss'],
})
export class FinanceRecordDialogComponent implements OnChanges {
  @Input() visible = false;
  // มีค่า = แก้ไขรายการนี้, null = เพิ่มใหม่
  @Input() record: FinanceRecord | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<string>();

  form: FormGroup;
  saving = false;
  errorMessage = '';

  readonly expenseSuggestions = ['ค่าเช่าสถานที่', 'ค่าไฟฟ้า', 'ค่าน้ำประปา', 'ค่าอินเทอร์เน็ต/โทรศัพท์', 'เงินเดือนพนักงาน', 'ค่าซ่อมบำรุง', 'ค่าวัสดุสำนักงาน', 'ค่าเดินทาง'];
  readonly incomeSuggestions = ['เงินสนับสนุน/บริจาค', 'ดอกเบี้ยรับ', 'รายรับอื่นๆ'];

  constructor(
    private fb: FormBuilder,
    private financeService: FinanceService,
  ) {
    this.form = this.fb.group({
      category: ['expense', Validators.required],
      item_name: ['', [Validators.required, Validators.maxLength(255)]],
      amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
      record_date: [this.today(), Validators.required],
      description: [''],
    });
  }

  ngOnChanges(): void {
    if (!this.visible) return;
    this.errorMessage = '';
    if (this.record) {
      this.form.reset({
        category: this.record.category,
        item_name: this.record.item_name,
        amount: Number(this.record.amount),
        record_date: String(this.record.record_date).slice(0, 10),
        description: this.record.description || '',
      });
    } else {
      this.form.reset({ category: 'expense', item_name: '', amount: null, record_date: this.today(), description: '' });
    }
  }

  get isEdit(): boolean {
    return !!this.record?.id;
  }

  get suggestions(): string[] {
    return this.form.get('category')?.value === 'income' ? this.incomeSuggestions : this.expenseSuggestions;
  }

  setCategory(category: 'income' | 'expense'): void {
    this.form.patchValue({ category });
  }

  pick(name: string): void {
    this.form.patchValue({ item_name: name });
  }

  invalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c && c.invalid && (c.dirty || c.touched));
  }

  close(): void {
    this.visibleChange.emit(false);
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const v = this.form.value;
    const payload = { ...v, item_name: v.item_name.trim(), description: v.description || undefined };
    this.saving = true;
    this.errorMessage = '';
    const request$ = this.isEdit
      ? this.financeService.updateFinanceRecord(this.record!.id!, payload)
      : this.financeService.createFinanceRecord(payload);

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.saved.emit(this.isEdit ? 'แก้ไขรายการแล้ว' : 'บันทึกรายการแล้ว');
        this.close();
      },
      error: (err) => {
        this.saving = false;
        const msg = err.error?.message;
        this.errorMessage = Array.isArray(msg) ? msg.join(', ') : msg || 'บันทึกไม่สำเร็จ';
      },
    });
  }

  private today(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
}
