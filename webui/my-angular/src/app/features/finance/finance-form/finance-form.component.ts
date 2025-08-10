import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { FinanceService, FinanceRecord } from '../../../core/services/finance.service';

@Component({
  selector: 'app-finance-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="finance-form-container">
      <!-- Header -->
      <div class="form-header">
        <h2>{{ isEditMode ? '✏️ แก้ไขรายการการเงิน' : '➕ เพิ่มรายการการเงิน' }}</h2>
        <button class="btn btn-secondary" (click)="goBack()">
          ← กลับ
        </button>
      </div>

      <!-- Form -->
      <div class="form-container">
        <form [formGroup]="financeForm" (ngSubmit)="onSubmit()" class="finance-form">
          <!-- Category -->
          <div class="form-group">
            <label for="category" class="required">ประเภทรายการ</label>
            <div class="radio-group">
              <label class="radio-item income">
                <input 
                  type="radio" 
                  value="income" 
                  formControlName="category"
                  id="income-radio">
                <span class="radio-custom"></span>
                <span class="radio-label">💰 รายรับ</span>
              </label>
              <label class="radio-item expense">
                <input 
                  type="radio" 
                  value="expense" 
                  formControlName="category"
                  id="expense-radio">
                <span class="radio-custom"></span>
                <span class="radio-label">💸 รายจ่าย</span>
              </label>
            </div>
            <div *ngIf="financeForm.get('category')?.invalid && financeForm.get('category')?.touched" class="error-text">
              กรุณาเลือกประเภทรายการ
            </div>
          </div>

          <!-- Item Name -->
          <div class="form-group">
            <label for="item_name" class="required">ชื่อรายการ</label>
            <input 
              type="text" 
              id="item_name"
              formControlName="item_name"
              placeholder="เช่น ค่าบริการทางการแพทย์, ค่าเช่า, ค่าไฟฟ้า"
              class="form-control"
              [class.error]="financeForm.get('item_name')?.invalid && financeForm.get('item_name')?.touched">
            <div *ngIf="financeForm.get('item_name')?.invalid && financeForm.get('item_name')?.touched" class="error-text">
              กรุณากรอกชื่อรายการ (อย่างน้อย 2 ตัวอักษร)
            </div>
          </div>

          <!-- Amount -->
          <div class="form-group">
            <label for="amount" class="required">จำนวนเงิน (บาท)</label>
            <div class="amount-input-container">
              <span class="currency-symbol">₿</span>
              <input 
                type="number" 
                id="amount"
                formControlName="amount"
                placeholder="0.00"
                min="0"
                step="0.01"
                class="form-control amount-input"
                [class.error]="financeForm.get('amount')?.invalid && financeForm.get('amount')?.touched">
            </div>
            <div *ngIf="financeForm.get('amount')?.invalid && financeForm.get('amount')?.touched" class="error-text">
              กรุณากรอกจำนวนเงินที่ถูกต้อง
            </div>
            <div *ngIf="financeForm.get('amount')?.value" class="amount-preview">
              จำนวนเงิน: {{ formatCurrency(financeForm.get('amount')?.value) }}
            </div>
          </div>

          <!-- Record Date -->
          <div class="form-group">
            <label for="record_date" class="required">วันที่บันทึก</label>
            <input 
              type="date" 
              id="record_date"
              formControlName="record_date"
              class="form-control"
              [class.error]="financeForm.get('record_date')?.invalid && financeForm.get('record_date')?.touched">
            <div *ngIf="financeForm.get('record_date')?.invalid && financeForm.get('record_date')?.touched" class="error-text">
              กรุณาเลือกวันที่บันทึก
            </div>
          </div>

          <!-- Description -->
          <div class="form-group">
            <label for="description">คำอธิบายเพิ่มเติม</label>
            <textarea 
              id="description"
              formControlName="description"
              placeholder="รายละเอียดเพิ่มเติมของรายการนี้..."
              rows="3"
              class="form-control">
            </textarea>
            <div class="character-count">
              {{ financeForm.get('description')?.value?.length || 0 }} / 500 ตัวอักษร
            </div>
          </div>

          <!-- Form Actions -->
          <div class="form-actions">
            <button 
              type="button" 
              class="btn btn-secondary" 
              (click)="goBack()">
              ยกเลิก
            </button>
            <button 
              type="submit" 
              class="btn btn-primary"
              [disabled]="financeForm.invalid || loading">
              <span *ngIf="loading" class="spinner-small"></span>
              {{ isEditMode ? 'บันทึกการแก้ไข' : 'เพิ่มรายการ' }}
            </button>
          </div>
        </form>

        <!-- Loading Overlay -->
        <div *ngIf="loading" class="loading-overlay">
          <div class="spinner"></div>
          <p>{{ isEditMode ? 'กำลังบันทึกการแก้ไข...' : 'กำลังเพิ่มรายการ...' }}</p>
        </div>
      </div>

      <!-- Error Message -->
      <div *ngIf="errorMessage" class="error-message">
        ❌ {{ errorMessage }}
        <button (click)="clearError()" class="close-btn">×</button>
      </div>

      <!-- Success Message -->
      <div *ngIf="successMessage" class="success-message">
        ✅ {{ successMessage }}
        <button (click)="clearSuccess()" class="close-btn">×</button>
      </div>
    </div>
  `,
  styleUrl: './finance-form.component.scss'
})
export class FinanceFormComponent implements OnInit {
  financeForm: FormGroup;
  isEditMode = false;
  recordId: number | null = null;
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private financeService: FinanceService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.financeForm = this.createForm();
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.recordId = +id;
        this.loadRecord();
      }
    });

    // Handle query params for pre-setting type
    this.route.queryParams.subscribe(params => {
      if (params['type'] && ['income', 'expense'].includes(params['type'])) {
        this.financeForm.patchValue({ category: params['type'] });
      }
    });
  }

  createForm(): FormGroup {
    return this.fb.group({
      category: ['', Validators.required],
      item_name: ['', [Validators.required, Validators.minLength(2)]],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      record_date: [new Date().toISOString().split('T')[0], Validators.required],
      description: ['', Validators.maxLength(500)]
    });
  }

  loadRecord() {
    if (!this.recordId) return;

    this.loading = true;
    this.financeService.getFinanceRecord(this.recordId).subscribe({
      next: (response) => {
        if (response.success) {
          const record = response.data;
          this.financeForm.patchValue({
            category: record.category,
            item_name: record.item_name,
            amount: record.amount,
            record_date: record.record_date.split('T')[0], // Format date for input
            description: record.description || ''
          });
        } else {
          this.errorMessage = response.message;
        }
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = 'เกิดข้อผิดพลาดในการโหลดข้อมูล';
        console.error('Error loading record:', error);
        this.loading = false;
      }
    });
  }

  onSubmit() {
    if (this.financeForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formData = this.financeForm.value;

    if (this.isEditMode && this.recordId) {
      // Update existing record
      this.financeService.updateFinanceRecord(this.recordId, formData).subscribe({
        next: (response) => {
          if (response.success) {
            this.successMessage = 'บันทึกการแก้ไขเรียบร้อยแล้ว';
            setTimeout(() => {
              this.router.navigate(['/finance/list']);
            }, 1500);
          } else {
            this.errorMessage = response.message;
          }
          this.loading = false;
        },
        error: (error) => {
          this.errorMessage = 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
          console.error('Error updating record:', error);
          this.loading = false;
        }
      });
    } else {
      // Create new record
      this.financeService.createFinanceRecord(formData).subscribe({
        next: (response) => {
          if (response.success) {
            this.successMessage = 'เพิ่มรายการเรียบร้อยแล้ว';
            setTimeout(() => {
              this.router.navigate(['/finance/list']);
            }, 1500);
          } else {
            this.errorMessage = response.message;
          }
          this.loading = false;
        },
        error: (error) => {
          this.errorMessage = 'เกิดข้อผิดพลาดในการเพิ่มรายการ';
          console.error('Error creating record:', error);
          this.loading = false;
        }
      });
    }
  }

  markFormGroupTouched() {
    Object.keys(this.financeForm.controls).forEach(field => {
      const control = this.financeForm.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }

  goBack() {
    this.router.navigate(['/finance/list']);
  }

  clearError() {
    this.errorMessage = '';
  }

  clearSuccess() {
    this.successMessage = '';
  }

  formatCurrency(amount: number): string {
    if (!amount) return '';
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB'
    }).format(amount);
  }
}
