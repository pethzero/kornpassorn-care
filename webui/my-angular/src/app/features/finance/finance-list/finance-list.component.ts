import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FinanceService, FinanceRecord, FinanceQueryParams } from '../../../core/services/finance.service';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-finance-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    // Angular Material
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTableModule,
    MatPaginatorModule,
    // PrimeNG
    CardModule,
    ButtonModule,
    InputTextModule,
    MessageModule,
    ProgressSpinnerModule
  ],
  template: `
    <div class="finance-list-container">
      <!-- Header -->
      <div class="page-header">
        <h1 class="page-title">
          <mat-icon>list</mat-icon>
          Finance Records
        </h1>
        <div class="header-actions">
          <button mat-raised-button color="primary" (click)="navigateToAdd()">
            <mat-icon>add</mat-icon>
            Add Record
          </button>
          <button mat-stroked-button (click)="navigateToSummary()">
            <mat-icon>dashboard</mat-icon>
            Dashboard
          </button>
        </div>
      </div>

      <!-- Filters -->
      <mat-card class="filters-card">
        <mat-card-content>
          <div class="filters-row">
            <!-- Search -->
            <mat-form-field appearance="outline" class="search-field">
              <mat-label>Search</mat-label>
              <input matInput 
                     [(ngModel)]="queryParams.search" 
                     (keyup.enter)="loadRecords()"
                     placeholder="Search by item name">
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>

            <!-- Category Filter -->
            <mat-form-field appearance="outline">
              <mat-label>Category</mat-label>
              <mat-select [(ngModel)]="queryParams.category" (selectionChange)="onFilterChange()">
                <mat-option value="">All</mat-option>
                <mat-option value="income">Income</mat-option>
                <mat-option value="expense">Expense</mat-option>
              </mat-select>
            </mat-form-field>

            <!-- Date Range -->
            <mat-form-field appearance="outline">
              <mat-label>Start Date</mat-label>
              <input matInput 
                     [matDatepicker]="startPicker" 
                     [(ngModel)]="startDate"
                     (dateChange)="onDateChange()">
              <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
              <mat-datepicker #startPicker></mat-datepicker>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>End Date</mat-label>
              <input matInput 
                     [matDatepicker]="endPicker" 
                     [(ngModel)]="endDate"
                     (dateChange)="onDateChange()">
              <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
              <mat-datepicker #endPicker></mat-datepicker>
            </mat-form-field>

            <!-- Actions -->
            <div class="filter-actions">
              <button mat-button (click)="clearFilters()">Clear</button>
              <button mat-raised-button color="primary" (click)="loadRecords()">Search</button>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Results -->
      <mat-card class="results-card">
        <mat-card-header>
          <mat-card-title>
            Records ({{ totalRecords }} total)
          </mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          <!-- Loading State -->
          <div *ngIf="loading" class="loading-container">
            <p-progressSpinner></p-progressSpinner>
            <p>Loading records...</p>
          </div>

          <!-- Table -->
          <div *ngIf="!loading && records.length > 0" class="table-container">
            <table mat-table [dataSource]="records" class="finance-table">
              <!-- Date Column -->
              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef>Date</th>
                <td mat-cell *matCellDef="let record">
                  {{ formatDate(record.record_date) }}
                </td>
              </ng-container>

              <!-- Category Column -->
              <ng-container matColumnDef="category">
                <th mat-header-cell *matHeaderCellDef>Category</th>
                <td mat-cell *matCellDef="let record">
                  <span class="category-badge" [class.income]="record.category === 'income'" [class.expense]="record.category === 'expense'">
                    <mat-icon>{{ record.category === 'income' ? 'trending_up' : 'trending_down' }}</mat-icon>
                    {{ record.category === 'income' ? 'Income' : 'Expense' }}
                  </span>
                </td>
              </ng-container>

              <!-- Item Name Column -->
              <ng-container matColumnDef="item_name">
                <th mat-header-cell *matHeaderCellDef>Item</th>
                <td mat-cell *matCellDef="let record">
                  <div class="item-info">
                    <div class="item-name">{{ record.item_name }}</div>
                    <div class="item-description" *ngIf="record.description">
                      {{ record.description }}
                    </div>
                  </div>
                </td>
              </ng-container>

              <!-- Amount Column -->
              <ng-container matColumnDef="amount">
                <th mat-header-cell *matHeaderCellDef>Amount</th>
                <td mat-cell *matCellDef="let record">
                  <span class="amount" [class.income]="record.category === 'income'" [class.expense]="record.category === 'expense'">
                    {{ formatCurrency(record.amount) }}
                  </span>
                </td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let record">
                  <div class="actions">
                    <button mat-icon-button (click)="editRecord(record)" title="Edit">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button color="warn" (click)="deleteRecord(record)" title="Delete">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>

            <!-- Pagination -->
            <mat-paginator 
              [length]="totalRecords"
              [pageSize]="queryParams.limit"
              [pageSizeOptions]="[10, 25, 50, 100]"
              [pageIndex]="(queryParams.page || 1) - 1"
              (page)="onPageChange($event)"
              showFirstLastButtons>
            </mat-paginator>
          </div>

          <!-- Empty State -->
          <div *ngIf="!loading && records.length === 0" class="empty-state">
            <mat-icon class="empty-icon">receipt_long</mat-icon>
            <h3>No records found</h3>
            <p>{{ hasFilters() ? 'Try adjusting your filters' : 'Start by adding your first finance record' }}</p>
            <button mat-raised-button color="primary" (click)="navigateToAdd()">
              <mat-icon>add</mat-icon>
              Add First Record
            </button>
          </div>

          <!-- Error Message -->
          <p-message 
            *ngIf="errorMessage" 
            severity="error" 
            [text]="errorMessage"
            [closable]="true"
            (onClose)="errorMessage = ''">
          </p-message>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styleUrl: './finance-list.component.scss'
})
export class FinanceListComponent implements OnInit {
  records: FinanceRecord[] = [];
  displayedColumns: string[] = ['date', 'category', 'item_name', 'amount', 'actions'];
  
  loading = false;
  errorMessage = '';
  totalRecords = 0;
  
  startDate: Date | null = null;
  endDate: Date | null = null;
  
  queryParams: FinanceQueryParams = {
    page: 1,
    limit: 10,
    sort_by: 'record_date',
    sort_order: 'DESC'
  };

  constructor(
    private financeService: FinanceService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadRecords();
  }

  loadRecords() {
    this.loading = true;
    this.errorMessage = '';

    // Set date filters
    if (this.startDate) {
      this.queryParams.start_date = this.startDate.toISOString().split('T')[0];
    }
    if (this.endDate) {
      this.queryParams.end_date = this.endDate.toISOString().split('T')[0];
    }

    this.financeService.getFinanceRecords(this.queryParams).subscribe({
      next: (response) => {
        if (response.success) {
          this.records = response.data;
          this.totalRecords = response.meta?.total || 0;
        } else {
          this.errorMessage = response.message;
        }
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = 'Error loading records';
        console.error('Error loading records:', error);
        this.loading = false;
      }
    });
  }

  onFilterChange() {
    this.queryParams.page = 1; // Reset to first page
    this.loadRecords();
  }

  onDateChange() {
    this.queryParams.page = 1; // Reset to first page
    this.loadRecords();
  }

  onPageChange(event: any) {
    this.queryParams.page = event.pageIndex + 1;
    this.queryParams.limit = event.pageSize;
    this.loadRecords();
  }

  clearFilters() {
    this.queryParams = {
      page: 1,
      limit: 10,
      sort_by: 'record_date',
      sort_order: 'DESC'
    };
    this.startDate = null;
    this.endDate = null;
    this.loadRecords();
  }

  hasFilters(): boolean {
    return !!(this.queryParams.search || this.queryParams.category || this.startDate || this.endDate);
  }

  // Navigation
  navigateToAdd() {
    this.router.navigate(['/finance/add']);
  }

  navigateToSummary() {
    this.router.navigate(['/finance/summary']);
  }

  editRecord(record: FinanceRecord) {
    this.router.navigate(['/finance/edit', record.id]);
  }

  deleteRecord(record: FinanceRecord) {
    if (confirm(`Are you sure you want to delete "${record.item_name}"?`)) {
      this.financeService.deleteFinanceRecord(record.id!).subscribe({
        next: (response) => {
          if (response.success) {
            this.loadRecords(); // Reload the list
          } else {
            this.errorMessage = response.message;
          }
        },
        error: (error) => {
          this.errorMessage = 'Error deleting record';
          console.error('Error deleting record:', error);
        }
      });
    }
  }

  // Utility methods
  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('th-TH');
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB'
    }).format(amount);
  }
}
