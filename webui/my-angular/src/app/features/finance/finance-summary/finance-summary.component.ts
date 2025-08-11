import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FinanceService, FinanceSummary } from '../../../core/services/finance.service';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { PanelModule } from 'primeng/panel';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';

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
    PanelModule,
    TagModule,
    MessageModule,
    SelectModule,
    // Angular Material
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule
  ],
  template: `
    <div class="finance-dashboard">
      <!-- Header Section -->
      <div class="dashboard-header">
        <h1 class="page-title">💰 Finance Dashboard</h1>
        <div class="header-actions">
          <button mat-raised-button color="primary" (click)="navigateToAdd()">
            <mat-icon>add</mat-icon>
            Add Transaction
          </button>
          <mat-icon class="settings-icon">settings</mat-icon>
        </div>
      </div>

      <!-- Stats Cards Row -->
      <div class="stats-grid">
        <!-- Income Card -->
        <div class="stat-card income-card">
          <div class="stat-header">
            <h3>Income</h3>
            <div class="growth positive">
              <span class="percentage">+12%</span>
              <mat-icon>trending_up</mat-icon>
            </div>
          </div>
          <div class="stat-value">{{ formatCurrency(summary?.income?.total || 45000) }}</div>
          <div class="mini-chart income-chart">
            <!-- Mini line chart would go here -->
            <svg width="100" height="30" viewBox="0 0 100 30">
              <path d="M5,25 Q25,15 45,20 T85,10" stroke="#4caf50" stroke-width="2" fill="none"/>
            </svg>
          </div>
        </div>

        <!-- Expense Card -->
        <div class="stat-card expense-card">
          <div class="stat-header">
            <h3>Expenses</h3>
            <div class="growth negative">
              <span class="percentage">+24%</span>
              <mat-icon>trending_down</mat-icon>
            </div>
          </div>
          <div class="stat-value">{{ formatCurrency(summary?.expense?.total || 28000) }}</div>
          <div class="mini-chart expense-chart">
            <svg width="100" height="30" viewBox="0 0 100 30">
              <path d="M5,15 Q25,25 45,10 T85,20" stroke="#f44336" stroke-width="2" fill="none"/>
            </svg>
          </div>
        </div>

        <!-- Net Income Card -->
        <div class="stat-card net-card">
          <div class="stat-header">
            <h3>Net Income</h3>
            <div class="growth positive">
              <span class="percentage">+18%</span>
              <mat-icon>trending_up</mat-icon>
            </div>
          </div>
          <div class="stat-value">{{ formatCurrency(summary?.net_income || 17000) }}</div>
          <div class="mini-chart net-chart">
            <svg width="100" height="30" viewBox="0 0 100 30">
              <path d="M5,20 Q25,10 45,15 T85,8" stroke="#2196f3" stroke-width="2" fill="none"/>
            </svg>
          </div>
        </div>

        <!-- Savings Card -->
        <div class="stat-card savings-card">
          <div class="stat-header">
            <h3>Savings</h3>
            <div class="progress-ring">
              <div class="progress-value">85%</div>
            </div>
          </div>
          <div class="stat-value">{{ formatCurrency(12750) }}</div>
          <div class="savings-goal">
            <div class="goal-text">Goal: {{ formatCurrency(15000) }}</div>
          </div>
        </div>
      </div>

      <!-- Main Content Grid -->
      <div class="main-content-grid">
        <!-- Left Column -->
        <div class="left-column">
          <!-- Finance Overview Chart -->
          <p-card class="chart-card">
            <ng-template pTemplate="header">
              <div class="card-header">
                <h3>Finance Overview</h3>
                <select [(ngModel)]="selectedPeriod" class="period-select">
                  <option *ngFor="let option of periodOptions" [value]="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </div>
            </ng-template>
            <div class="chart-container">
              <!-- Bar Chart Area -->
              <div class="chart-legend">
                <div class="legend-item">
                  <div class="legend-color income-color"></div>
                  <span>Income</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color expense-color"></div>
                  <span>Expense</span>
                </div>
              </div>
              <div class="bar-chart">
                <div class="chart-bars">
                  <div class="day-bar" *ngFor="let day of weeklyData">
                    <div class="bar-group">
                      <div class="bar income-bar" [style.height.%]="day.incomePercent"></div>
                      <div class="bar expense-bar" [style.height.%]="day.expensePercent"></div>
                    </div>
                    <div class="day-label">{{ day.day }}</div>
                  </div>
                </div>
              </div>
            </div>
          </p-card>

          <!-- Recent Transactions -->
          <p-card class="transactions-card">
            <ng-template pTemplate="header">
              <div class="card-header">
                <h3>Recent Transactions</h3>
                <div class="header-actions">
                  <mat-form-field appearance="outline" class="search-field">
                    <mat-icon matPrefix>search</mat-icon>
                    <input matInput placeholder="Search" [(ngModel)]="searchTerm">
                  </mat-form-field>
                  <button mat-icon-button color="primary">
                    <mat-icon>download</mat-icon>
                  </button>
                </div>
              </div>
            </ng-template>
            <div class="transactions-table">
              <div class="table-header">
                <div class="header-cell">Name</div>
                <div class="header-cell">Category</div>
                <div class="header-cell">Amount</div>
                <div class="header-cell">Status</div>
                <div class="header-cell">Actions</div>
              </div>
              <div class="table-row" *ngFor="let transaction of recentTransactions">
                <div class="cell name-cell">
                  <div class="transaction-info">
                    <div class="transaction-name">{{ transaction.description }}</div>
                    <div class="transaction-date">{{ transaction.date | date:'MMM dd' }}</div>
                  </div>
                </div>
                <div class="cell">
                  <span class="category-badge" [class]="transaction.category">
                    {{ transaction.category }}
                  </span>
                </div>
                <div class="cell amount-cell" [class.income]="transaction.type === 'income'" [class.expense]="transaction.type === 'expense'">
                  {{ formatCurrency(transaction.amount) }}
                </div>
                <div class="cell">
                  <span class="status-badge" [class]="transaction.status">
                    {{ transaction.status }}
                  </span>
                </div>
                <div class="cell actions-cell">
                  <button mat-icon-button>
                    <mat-icon>visibility</mat-icon>
                  </button>
                </div>
              </div>
            </div>
          </p-card>
        </div>

        <!-- Right Column -->
        <div class="right-column">
          <!-- Category Breakdown -->
          <p-card class="category-card">
            <ng-template pTemplate="header">
              <h3>Expenses by Category</h3>
            </ng-template>
            <div class="category-chart">
              <!-- Pie Chart -->
              <div class="pie-chart">
                <svg width="150" height="150" viewBox="0 0 150 150">
                  <circle cx="75" cy="75" r="60" fill="#6366f1" stroke="#fff" stroke-width="2"/>
                  <circle cx="75" cy="75" r="60" fill="#8b5cf6" stroke="#fff" stroke-width="2" 
                          stroke-dasharray="94.2 283.7" stroke-dashoffset="0" transform="rotate(-90 75 75)"/>
                  <circle cx="75" cy="75" r="60" fill="#06b6d4" stroke="#fff" stroke-width="2" 
                          stroke-dasharray="75.4 302.5" stroke-dashoffset="-94.2" transform="rotate(-90 75 75)"/>
                </svg>
                <div class="chart-center">
                  <div class="center-percentage">65%</div>
                  <div class="center-label">Total</div>
                </div>
              </div>
              <div class="category-legend">
                <div class="legend-item">
                  <div class="legend-dot" style="background: #6366f1;"></div>
                  <span class="legend-label">Food & Dining</span>
                  <span class="legend-value">40%</span>
                </div>
                <div class="legend-item">
                  <div class="legend-dot" style="background: #8b5cf6;"></div>
                  <span class="legend-label">Transportation</span>
                  <span class="legend-value">25%</span>
                </div>
                <div class="legend-item">
                  <div class="legend-dot" style="background: #06b6d4;"></div>
                  <span class="legend-label">Shopping</span>
                  <span class="legend-value">20%</span>
                </div>
                <div class="legend-item">
                  <div class="legend-dot" style="background: #f59e0b;"></div>
                  <span class="legend-label">Others</span>
                  <span class="legend-value">15%</span>
                </div>
              </div>
            </div>
          </p-card>

          <!-- Top Categories -->
          <p-card class="top-categories-card">
            <ng-template pTemplate="header">
              <h3>Top Spending Categories</h3>
            </ng-template>
            <div class="top-categories">
              <div class="category-item" *ngFor="let category of topCategories">
                <div class="category-info">
                  <div class="category-icon">
                    <img [src]="category.icon" [alt]="category.name" width="40" height="40">
                  </div>
                  <div class="category-details">
                    <div class="category-name">{{ category.name }}</div>
                    <div class="category-count">{{ category.transactionCount }} transactions</div>
                  </div>
                </div>
                <div class="category-amount">
                  {{ formatCurrency(category.amount) }}
                </div>
              </div>
            </div>
          </p-card>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-overlay">
        <p-progressSpinner></p-progressSpinner>
        <p>Loading financial data...</p>
      </div>

      <!-- Error Messages -->
      <p-message 
        *ngIf="errorMessage" 
        severity="error" 
        [text]="errorMessage"
        [closable]="true"
        (onClose)="errorMessage = ''">
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
  
  // New properties for dashboard
  searchTerm = '';
  selectedPeriod = 'Last Week';
  periodOptions = [
    { label: 'Last Week', value: 'Last Week' },
    { label: 'Last Month', value: 'Last Month' },
    { label: 'Last 3 Months', value: 'Last 3 Months' },
    { label: 'Last Year', value: 'Last Year' }
  ];
  
  weeklyData = [
    { day: 'MON', incomePercent: 65, expensePercent: 45 },
    { day: 'TUE', incomePercent: 55, expensePercent: 35 },
    { day: 'WED', incomePercent: 80, expensePercent: 60 },
    { day: 'THU', incomePercent: 85, expensePercent: 50 },
    { day: 'FRI', incomePercent: 75, expensePercent: 40 },
    { day: 'SAT', incomePercent: 90, expensePercent: 65 },
    { day: 'SUN', incomePercent: 70, expensePercent: 30 }
  ];
  
  recentTransactions = [
    {
      description: 'Salary Payment',
      category: 'income',
      amount: 45000,
      type: 'income',
      status: 'completed',
      date: new Date()
    },
    {
      description: 'Grocery Shopping',
      category: 'food',
      amount: -1200,
      type: 'expense',
      status: 'completed',
      date: new Date()
    },
    {
      description: 'Gas Station',
      category: 'transport',
      amount: -800,
      type: 'expense',
      status: 'completed',
      date: new Date()
    }
  ];
  
  topCategories = [
    {
      name: 'Food & Dining',
      amount: 12500,
      transactionCount: 24,
      icon: '/assets/picture/food-icon.png'
    },
    {
      name: 'Transportation',
      amount: 8500,
      transactionCount: 18,
      icon: '/assets/picture/transport-icon.png'
    },
    {
      name: 'Shopping',
      amount: 6200,
      transactionCount: 15,
      icon: '/assets/picture/shopping-icon.png'
    }
  ];

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
