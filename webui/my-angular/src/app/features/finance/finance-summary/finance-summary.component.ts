import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FinanceService, FinanceSummary } from '../../../core/services/finance.service';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { PanelModule } from 'primeng/panel';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';

@Component({
  selector: 'app-finance-summary',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    // PrimeNG
    CardModule,
    ButtonModule,
    ProgressSpinnerModule,
    MessageModule,
    TagModule,
    PanelModule,
    // Angular Material
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="finance-summary-container">
      <!-- Header with Angular Material -->
      <mat-card class="header-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>account_balance</mat-icon>
            สรุปการเงิน
          </mat-card-title>
          <div class="header-actions">
            <button mat-raised-button color="primary" (click)="navigateToAdd()">
              <mat-icon>add</mat-icon>
              เพิ่มรายการ
            </button>
            <button mat-raised-button color="accent" (click)="navigateToList()">
              <mat-icon>list</mat-icon>
              ดูรายการทั้งหมด
            </button>
          </div>
        </mat-card-header>
      </mat-card>

      <!-- Date Filter with PrimeNG -->
      <p-panel header="🔍 ตัวกรองข้อมูล" [collapsed]="false" [toggleable]="true">
        <div class="date-filter">
          <div class="p-field p-col-12 p-md-4">
            <label for="startDate">จากวันที่:</label>
            <input 
              type="date" 
              id="startDate"
              [(ngModel)]="startDate" 
              (change)="onDateChange()"
              class="form-control">
          </div>
          <div class="p-field p-col-12 p-md-4">
            <label for="endDate">ถึงวันที่:</label>
            <input 
              type="date" 
              id="endDate"
              [(ngModel)]="endDate" 
              (change)="onDateChange()"
              class="form-control">
          </div>
          <div class="p-field p-col-12 p-md-4">
            <p-button 
              label="รีเซ็ต" 
              icon="pi pi-refresh" 
              [outlined]="true"
              (onClick)="clearFilter()">
            </p-button>
          </div>
        </div>
      </p-panel>

      <!-- Loading with PrimeNG -->
      <div *ngIf="loading" class="loading-container">
        <p-progressSpinner styleClass="w-4rem h-4rem"></p-progressSpinner>
        <p>กำลังโหลดข้อมูล...</p>
      </div>

      <!-- Summary Cards with mix of both libraries -->
      <div *ngIf="!loading && summary" class="summary-grid">
        <!-- Income Card - PrimeNG -->
        <p-card header="💰 รายรับ" [style]="{'background': 'linear-gradient(135deg, #c8e6c9, #a5d6a7)'}">
          <div class="summary-content">
            <div class="amount-display income">{{ formatCurrency(summary.income.total) }}</div>
            <div class="details">
              <p><strong>จำนวนรายการ:</strong> {{ summary.income.count }} รายการ</p>
              <p><strong>เฉลี่ย:</strong> {{ formatCurrency(summary.income.average) }}</p>
            </div>
            <p-tag severity="success" value="รายรับ" icon="pi pi-arrow-up"></p-tag>
          </div>
        </p-card>

        <!-- Expense Card - Angular Material -->
        <mat-card class="expense-card">
          <mat-card-header>
            <mat-card-title>💸 รายจ่าย</mat-card-title>
            <mat-icon class="header-icon">trending_down</mat-icon>
          </mat-card-header>
          <mat-card-content>
            <div class="amount-display expense">{{ formatCurrency(summary.expense.total) }}</div>
            <div class="details">
              <p><strong>จำนวนรายการ:</strong> {{ summary.expense.count }} รายการ</p>
              <p><strong>เฉลี่ย:</strong> {{ formatCurrency(summary.expense.average) }}</p>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Net Income Card - PrimeNG -->
        <p-card header="💼 กำไรสุทธิ" 
                [style]="{'background': summary.net_income >= 0 ? 'linear-gradient(135deg, #bbdefb, #90caf9)' : 'linear-gradient(135deg, #ffcdd2, #f8bbd9)'}">
          <div class="summary-content">
            <div class="amount-display" [class.profit]="summary.net_income >= 0" [class.loss]="summary.net_income < 0">
              {{ formatCurrency(summary.net_income) }}
            </div>
            <div class="details">
              <p><strong>สถานะ:</strong> {{ summary.net_income >= 0 ? '✅ กำไร' : '❌ ขาดทุน' }}</p>
              <p><strong>ช่วงเวลา:</strong> {{ getDateRangeText() }}</p>
            </div>
            <p-tag 
              [severity]="summary.net_income >= 0 ? 'info' : 'warning'" 
              [value]="summary.net_income >= 0 ? 'กำไร' : 'ขาดทุน'"
              [icon]="summary.net_income >= 0 ? 'pi pi-check' : 'pi pi-exclamation-triangle'">
            </p-tag>
          </div>
        </p-card>
      </div>

      <!-- Quick Actions with Angular Material -->
      <mat-card class="quick-actions-card">
        <mat-card-header>
          <mat-card-title>⚡ การดำเนินการด่วน</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="action-grid">
            <button mat-fab extended color="primary" (click)="quickAddIncome()">
              <mat-icon>add</mat-icon>
              เพิ่มรายรับ
            </button>
            <button mat-fab extended color="warn" (click)="quickAddExpense()">
              <mat-icon>remove</mat-icon>
              เพิ่มรายจ่าย
            </button>
            <button mat-fab extended color="accent" (click)="viewReports()">
              <mat-icon>bar_chart</mat-icon>
              ดูรายงาน
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Error Message with PrimeNG -->
      <p-message 
        *ngIf="errorMessage" 
        severity="error" 
        [text]="errorMessage"
        [closable]="true"
        (onClose)="errorMessage = ''">
      </p-message>

      <!-- Success Message with PrimeNG -->
      <p-message 
        *ngIf="successMessage" 
        severity="success" 
        [text]="successMessage"
        [closable]="true"
        (onClose)="successMessage = ''">
      </p-message>
    </div>
  `,
  styleUrl: './finance-summary.component.scss'
})
export class FinanceSummaryComponent implements OnInit {
  summary: FinanceSummary | null = null;
  startDate: string = '';
  endDate: string = '';
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private financeService: FinanceService,
    private router: Router
  ) {
    // Set default date range (current month)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    this.startDate = firstDay.toISOString().split('T')[0];
    this.endDate = lastDay.toISOString().split('T')[0];
  }

  ngOnInit() {
    this.loadSummary();
  }

  loadSummary() {
    this.loading = true;
    this.errorMessage = '';
    
    this.financeService.getSummary(this.startDate, this.endDate).subscribe({
      next: (response) => {
        if (response.success) {
          this.summary = response.data;
        } else {
          this.errorMessage = response.message;
        }
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = 'เกิดข้อผิดพลาดในการโหลดข้อมูล';
        console.error('Error loading summary:', error);
        this.loading = false;
      }
    });
  }

  onDateChange() {
    if (this.startDate && this.endDate) {
      this.loadSummary();
    }
  }

  clearFilter() {
    this.startDate = '';
    this.endDate = '';
    this.loadSummary();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB'
    }).format(amount);
  }

  getDateRangeText(): string {
    if (!this.summary?.date_range) return 'ทั้งหมด';
    if (this.summary.date_range.start_date && this.summary.date_range.end_date) {
      return `${this.summary.date_range.start_date} - ${this.summary.date_range.end_date}`;
    }
    return 'ทั้งหมด';
  }

  // Navigation methods
  navigateToAdd() {
    this.router.navigate(['/finance/add']);
  }

  navigateToList() {
    this.router.navigate(['/finance/list']);
  }

  quickAddIncome() {
    this.router.navigate(['/finance/add'], { queryParams: { type: 'income' } });
  }

  quickAddExpense() {
    this.router.navigate(['/finance/add'], { queryParams: { type: 'expense' } });
  }

  viewReports() {
    // TODO: Navigate to reports page
    console.log('Navigate to reports');
  }
}
