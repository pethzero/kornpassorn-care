import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

interface FinanceRecord {
  id?: number;
  item_name: string;
  category: 'income' | 'expense';
  amount: number;
  record_date: Date;
  description?: string;
  created_at?: Date;
  updated_at?: Date;
}

@Component({
  selector: 'app-finance-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    ToastModule
  ],
  templateUrl: './finance-form.component.html',
  styleUrls: ['./finance-form.component.scss'],
  providers: [MessageService]
})
export class FinanceFormComponent implements OnInit {
  financeForm: FormGroup;
  isEditMode = false;
  recordId: number | null = null;
  loading = false;
  
  categoryOptions = [
    { label: '💰 รายรับ', value: 'income' },
    { label: '💸 รายจ่าย', value: 'expense' }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService
  ) {
    this.financeForm = this.createForm();
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.recordId = parseInt(params['id']);
        this.isEditMode = true;
        this.loadRecord();
      }
    });
  }

  private createForm(): FormGroup {
    return this.fb.group({
      item_name: ['', [Validators.required, Validators.minLength(2)]],
      category: ['', Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      record_date: [new Date(), Validators.required],
      description: ['']
    });
  }

  private loadRecord(): void {
    if (!this.recordId) return;
    
    this.loading = true;
    
    // Simulate API call - Replace with actual service call
    setTimeout(() => {
      // Mock data for demonstration
      const mockRecord: FinanceRecord = {
        id: this.recordId!,
        item_name: 'ค่าอาหาร',
        category: 'expense',
        amount: 250,
        record_date: new Date(),
        description: 'ค่าอาหารกลางวัน'
      };
      
      this.financeForm.patchValue({
        item_name: mockRecord.item_name,
        category: mockRecord.category,
        amount: mockRecord.amount,
        record_date: mockRecord.record_date,
        description: mockRecord.description
      });
      
      this.loading = false;
    }, 1000);
  }

  onSubmit(): void {
    if (this.financeForm.invalid) {
      this.markFormGroupTouched();
      this.showError('กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง');
      return;
    }

    this.loading = true;
    const formData = this.financeForm.value;

    // Simulate API call - Replace with actual service call
    setTimeout(() => {
      if (this.isEditMode) {
        this.showSuccess('แก้ไขรายการสำเร็จ');
      } else {
        this.showSuccess('เพิ่มรายการสำเร็จ');
      }
      
      this.loading = false;
      this.router.navigate(['/finance/list']);
    }, 1500);
  }

  onCancel(): void {
    this.router.navigate(['/finance/list']);
  }

  onReset(): void {
    this.financeForm.reset();
    this.financeForm.patchValue({
      record_date: new Date()
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.financeForm.controls).forEach(key => {
      const control = this.financeForm.get(key);
      control?.markAsTouched();
    });
  }

  private showSuccess(message: string): void {
    this.messageService.add({
      severity: 'success',
      summary: 'สำเร็จ',
      detail: message
    });
  }

  private showError(message: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'เกิดข้อผิดพลาด',
      detail: message
    });
  }

  // Getter methods for template
  get itemName() { return this.financeForm.get('item_name'); }
  get category() { return this.financeForm.get('category'); }
  get amount() { return this.financeForm.get('amount'); }
  get recordDate() { return this.financeForm.get('record_date'); }
  get description() { return this.financeForm.get('description'); }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.financeForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.financeForm.get(fieldName);
    if (field && field.errors && (field.dirty || field.touched)) {
      if (field.errors['required']) {
        return 'กรุณากรอกข้อมูลนี้';
      }
      if (field.errors['minlength']) {
        return 'ข้อมูลสั้นเกินไป';
      }
      if (field.errors['min']) {
        return 'จำนวนเงินต้องมากกว่า 0';
      }
    }
    return '';
  }
}
