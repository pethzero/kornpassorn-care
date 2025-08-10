import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FinanceService, FinanceRecord, FinanceQueryParams, PaginatedResponse } from '../../../core/services/finance.service';

@Component({
  selector: 'app-finance-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="finance-list-container">
      <!-- Header -->
      <div class="list-header">
        <h2>📋 รายการการเงิน</h2>
        <div class="header-actions">
          <button class="btn btn-primary" (click)="navigateToAdd()">
            ➕ เพิ่มรายการใหม่
          </button>
          <button class="btn btn-secondary" (click)="navigateToSummary()">
            📊 ดูสรุป
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="filter-row">
          <div class="filter-group">
            <label>ประเภท:</label>
            <select [(ngModel)]="queryParams.category" (change)="onFilterChange()" class="form-control">
              <option value="">ทั้งหมด</option>
              <option value="income">รายรับ</option>
              <option value="expense">รายจ่าย</option>
            </select>
          </div>

          <div class="filter-group">
            <label>ค้นหา:</label>
            <input 
              type="text" 
              [(ngModel)]="queryParams.search" 
              (input)="onSearchChange()"
              placeholder="ค้นหาชื่อรายการ..."
              class="form-control">
          </div>

          <div class="filter-group">
            <label>จากวันที่:</label>
            <input 
              type="date" 
              [(ngModel)]="queryParams.start_date" 
              (change)="onFilterChange()"
              class="form-control">
          </div>

          <div class="filter-group">
            <label>ถึงวันที่:</label>
            <input 
              type="date" 
              [(ngModel)]="queryParams.end_date" 
              (change)="onFilterChange()"
              class="form-control">
          </div>

          <button class="btn btn-info" (click)="clearFilters()">🔄 รีเซ็ต</button>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="loading">
        <div class="spinner"></div>
        <p>กำลังโหลดข้อมูล...</p>
      </div>

      <!-- Records Table -->
      <div *ngIf="!loading" class="table-container">
        <div class="table-header">
          <div class="table-info">
            <span>แสดง {{ records.length }} รายการ จากทั้งหมด {{ totalRecords }} รายการ</span>
          </div>
          <div class="sort-controls">
            <label>เรียงตาม:</label>
            <select [(ngModel)]="queryParams.sort_by" (change)="onFilterChange()" class="form-control">
              <option value="created_at">วันที่สร้าง</option>
              <option value="record_date">วันที่บันทึก</option>
              <option value="amount">จำนวนเงิน</option>
              <option value="item_name">ชื่อรายการ</option>
            </select>
            <select [(ngModel)]="queryParams.sort_order" (change)="onFilterChange()" class="form-control">
              <option value="DESC">มากไปน้อย</option>
              <option value="ASC">น้อยไปมาก</option>
            </select>
          </div>
        </div>

        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>วันที่</th>
                <th>ประเภท</th>
                <th>รายการ</th>
                <th>จำนวนเงิน</th>
                <th>คำอธิบาย</th>
                <th>การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let record of records" class="table-row">
                <td>{{ formatDate(record.record_date) }}</td>
                <td>
                  <span class="badge" [class.income]="record.category === 'income'" [class.expense]="record.category === 'expense'">
                    {{ record.category === 'income' ? '💰 รายรับ' : '💸 รายจ่าย' }}
                  </span>
                </td>
                <td class="item-name">{{ record.item_name }}</td>
                <td class="amount" [class.income]="record.category === 'income'" [class.expense]="record.category === 'expense'">
                  {{ formatCurrency(record.amount) }}
                </td>
                <td class="description">{{ record.description || '-' }}</td>
                <td>
                  <div class="action-buttons">
                    <button class="btn-action edit" (click)="editRecord(record)" title="แก้ไข">
                      ✏️
                    </button>
                    <button class="btn-action delete" (click)="deleteRecord(record)" title="ลบ">
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Empty State -->
          <div *ngIf="records.length === 0" class="empty-state">
            <div class="empty-icon">📭</div>
            <h3>ไม่พบข้อมูลรายการการเงิน</h3>
            <p>ลองปรับเปลี่ยนตัวกรองหรือเพิ่มรายการใหม่</p>
            <button class="btn btn-primary" (click)="navigateToAdd()">
              ➕ เพิ่มรายการแรก
            </button>
          </div>
        </div>

        <!-- Pagination -->
        <div *ngIf="totalPages > 1" class="pagination-container">
          <div class="pagination-info">
            หน้า {{ currentPage }} จาก {{ totalPages }}
          </div>
          <div class="pagination-controls">
            <button 
              class="btn btn-secondary" 
              [disabled]="currentPage === 1"
              (click)="goToPage(currentPage - 1)">
              ← ก่อนหน้า
            </button>
            
            <div class="page-numbers">
              <button 
                *ngFor="let page of getPageNumbers()" 
                class="page-btn"
                [class.active]="page === currentPage"
                (click)="goToPage(page)">
                {{ page }}
              </button>
            </div>

            <button 
              class="btn btn-secondary" 
              [disabled]="currentPage === totalPages"
              (click)="goToPage(currentPage + 1)">
              ถัดไป →
            </button>
          </div>
        </div>
      </div>

      <!-- Error Message -->
      <div *ngIf="errorMessage" class="error-message">
        ❌ {{ errorMessage }}
        <button (click)="loadRecords()" class="retry-btn">🔄 ลองใหม่</button>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div *ngIf="showDeleteModal" class="modal-overlay" (click)="cancelDelete()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <h3>ยืนยันการลบ</h3>
        <p>คุณต้องการลบรายการ "<strong>{{ recordToDelete?.item_name }}</strong>" ใช่หรือไม่?</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" (click)="cancelDelete()">ยกเลิก</button>
          <button class="btn btn-danger" (click)="confirmDelete()">ลบ</button>
        </div>
      </div>
    </div>
  `,
  styleUrl: './finance-list.component.scss'
})
export class FinanceListComponent implements OnInit {
  records: FinanceRecord[] = [];
  queryParams: FinanceQueryParams = {
    page: 1,
    limit: 10,
    sort_by: 'created_at',
    sort_order: 'DESC'
  };
  
  loading = false;
  errorMessage = '';
  searchTimeout: any;
  
  // Pagination
  currentPage = 1;
  totalPages = 0;
  totalRecords = 0;
  
  // Delete modal
  showDeleteModal = false;
  recordToDelete: FinanceRecord | null = null;

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
    
    this.financeService.getFinanceRecords(this.queryParams).subscribe({
      next: (response: PaginatedResponse<FinanceRecord>) => {
        if (response.success) {
          this.records = response.data;
          this.currentPage = response.meta.page;
          this.totalPages = response.meta.total_pages;
          this.totalRecords = response.meta.total;
        } else {
          this.errorMessage = response.message;
        }
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = 'เกิดข้อผิดพลาดในการโหลดข้อมูล';
        console.error('Error loading records:', error);
        this.loading = false;
      }
    });
  }

  onFilterChange() {
    this.queryParams.page = 1;
    this.loadRecords();
  }

  onSearchChange() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.onFilterChange();
    }, 500); // Debounce search
  }

  clearFilters() {
    this.queryParams = {
      page: 1,
      limit: 10,
      sort_by: 'created_at',
      sort_order: 'DESC'
    };
    this.loadRecords();
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.queryParams.page = page;
      this.loadRecords();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  // Navigation methods
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
    this.recordToDelete = record;
    this.showDeleteModal = true;
  }

  cancelDelete() {
    this.showDeleteModal = false;
    this.recordToDelete = null;
  }

  confirmDelete() {
    if (this.recordToDelete?.id) {
      this.financeService.deleteFinanceRecord(this.recordToDelete.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.loadRecords(); // Refresh the list
            this.showDeleteModal = false;
            this.recordToDelete = null;
          } else {
            this.errorMessage = response.message;
          }
        },
        error: (error) => {
          this.errorMessage = 'เกิดข้อผิดพลาดในการลบข้อมูล';
          console.error('Error deleting record:', error);
        }
      });
    }
  }

  // Utility methods
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB'
    }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('th-TH');
  }
}
