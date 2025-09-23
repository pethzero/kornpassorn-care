import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FinanceService,  } from '../../../core/services/finance.service';
import { FinanceSummary } from '../../../core/models/finance.model';
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
  templateUrl: './finance-summary.component.html',
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
