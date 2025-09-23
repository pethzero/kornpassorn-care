import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FinanceService } from '../../../core/services/finance.service';
import { FinanceQueryParams, FinanceRecord } from '../../../core/models/finance.model';

// PrimeNG Modules
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';


@Component({
  selector: 'app-finance-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    TableModule,
    TagModule,
    ProgressSpinnerModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule
  ],
  templateUrl: './finance-list.component.html',
  styleUrls: ['./finance-list.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class FinanceListComponent implements OnInit {
  financeRecords: FinanceRecord[] = [];
  loading = false;

  // Pagination
  currentPage = 0;
  pageSize = 10;
  totalRecords = 0;

  // Filters
  searchTerm = '';
  selectedCategory: 'income' | 'expense' | '' = '';
  dateRange: Date[] = [];
  startDate: string = '';
  endDate: string = '';

  // Options
  categoryOptions = [
    { label: 'ทุกประเภท', value: '' },
    { label: '💰 รายรับ', value: 'income' },
    { label: '💸 รายจ่าย', value: 'expense' }
  ];

  constructor(
    private router: Router,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private financeService: FinanceService
  ) { }

  incomeGrowth = 0;

  ngOnInit(): void {
    console.log('ngOnInit called ✅');
    this.loadFinanceRecords();
    this.incomeGrowth = Math.floor(Math.random() * 20) + 5;
  }

  loadFinanceRecords(queryParams: FinanceQueryParams = {}): void {
    console.log('loadFinanceRecords called ✅');
    this.loading = true;

    this.financeService.getFinanceRecords({
      page: this.currentPage + 1,
      limit: this.pageSize,
      search: this.searchTerm,
      category: this.selectedCategory || undefined,
      start_date: this.startDate || undefined,
      end_date: this.endDate || undefined,
      ...queryParams
    }).subscribe({
      next: (res) => {
        console.log('API response ✅', res);
        this.financeRecords = res.data;
        this.totalRecords = res.meta.total;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading finance records:', err);
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'ผิดพลาด',
          detail: 'ไม่สามารถโหลดข้อมูลได้'
        });
      }
    });
  }
  onPageChange(event: any): void {
    this.currentPage = event.first / event.rows;
    this.pageSize = event.rows;
    this.loadFinanceRecords();
  }

  loadData(): void {
    this.loading = true;

    // Simulate API call - Replace with actual service call
    setTimeout(() => {
      // Mock data for demonstration
      this.financeRecords = [
        {
          id: 1,
          item_name: 'เงินเดือน',
          category: 'income',
          amount: 50000,
          record_date: new Date('2024-01-15'),
          description: 'เงินเดือนเดือนมกราคม',
          created_at: new Date('2024-01-15')
        },
        {
          id: 2,
          item_name: 'ค่าอาหาร',
          category: 'expense',
          amount: 250,
          record_date: new Date('2024-01-16'),
          description: 'อาหารกลางวัน',
          created_at: new Date('2024-01-16')
        },
        {
          id: 3,
          item_name: 'ค่าเช่าบ้าน',
          category: 'expense',
          amount: 15000,
          record_date: new Date('2024-01-01'),
          description: 'ค่าเช่าบ้านเดือนมกราคม',
          created_at: new Date('2024-01-01')
        },
        {
          id: 4,
          item_name: 'โบนัส',
          category: 'income',
          amount: 10000,
          record_date: new Date('2024-01-20'),
          description: 'โบนัสประจำปี',
          created_at: new Date('2024-01-20')
        },
        {
          id: 5,
          item_name: 'ค่าน้ำมัน',
          category: 'expense',
          amount: 800,
          record_date: new Date('2024-01-18'),
          description: 'ค่าน้ำมันรถ',
          created_at: new Date('2024-01-18')
        }
      ];

      this.totalRecords = this.financeRecords.length;
      this.loading = false;
    }, 1000);
  }

  navigateToAdd(): void {
    this.router.navigate(['/finance/form']);
  }

  navigateToSummary(): void {
    this.router.navigate(['/finance/summary']);
  }

  editRecord(record: FinanceRecord): void {
    this.router.navigate(['/finance/form', record.id]);
  }

  confirmDelete(record: FinanceRecord): void {
    this.confirmationService.confirm({
      message: `คุณต้องการลบรายการ "${record.item_name}" ใช่หรือไม่?`,
      header: 'ยืนยันการลบ',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'ลบ',
      rejectLabel: 'ยกเลิก',
      accept: () => {
        this.deleteRecord(record);
      }
    });
  }

  deleteRecord(record: FinanceRecord): void {
    this.loading = true;

    // Simulate API call - Replace with actual service call
    setTimeout(() => {
      this.financeRecords = this.financeRecords.filter(r => r.id !== record.id);
      this.totalRecords = this.financeRecords.length;
      this.loading = false;

      this.messageService.add({
        severity: 'success',
        summary: 'สำเร็จ',
        detail: 'ลบรายการเรียบร้อยแล้ว'
      });
    }, 500);
  }

  onSearch(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  onDateRangeChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = '';
    this.dateRange = [];
    this.startDate = '';
    this.endDate = '';
    this.loadData();
  }

  private applyFilters(): void {
    // Apply filters logic here - For now just reload data
    this.loadData();
  }

  // Utility methods
  getCategoryLabel(category: string): string {
    return category === 'income' ? 'รายรับ' : 'รายจ่าย';
  }

  getCategorySeverity(category: string): string {
    return category === 'income' ? 'success' : 'danger';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB'
    }).format(amount);
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(date));
  }

  truncateText(text: string | undefined, maxLength: number): string {
    if (!text) return '-';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  // Stats calculation methods
  getTotalIncome(): number {
    return this.financeRecords
      .filter(record => record.category === 'income')
      .reduce((sum, record) => sum + record.amount, 0);
  }

  getTotalExpenses(): number {
    return this.financeRecords
      .filter(record => record.category === 'expense')
      .reduce((sum, record) => sum + record.amount, 0);
  }

  getNetBalance(): number {
    return this.getTotalIncome() - this.getTotalExpenses();
  }

  getNewTransactionsToday(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.financeRecords.filter(record => {
      const recordDate = new Date(record.created_at || record.record_date);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate.getTime() === today.getTime();
    }).length;
  }

  // ทุกครั้งที่ Angular re-render มันจะ คำนวณใหม่ (เพราะ method ถูกเรียกจาก template โดยตรง) → เลยสุ่มค่าใหม่ตลอด ทำให้ Angular ตรวจครั้งแรกได้ 21 พอตรวจซ้ำเจอ 23 → error ทันที 🚨
  getIncomeGrowth(): number {
    // Simulate growth percentage - replace with actual calculation
    return Math.floor(Math.random() * 20) + 5;
  }

  getExpenseGrowth(): number {
    // Simulate growth percentage - replace with actual calculation
    return Math.floor(Math.random() * 15) + 3;
  }

  viewRecord(record: FinanceRecord): void {
    // Navigate to view detail page or show modal
    console.log('View record:', record);
    this.messageService.add({
      severity: 'info',
      summary: 'ข้อมูลรายการ',
      detail: `ID: ${record.id} - ${record.item_name}`
    });
  }
}
