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
import { Tag, TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { PrimeIcons, MenuItem } from 'primeng/api';
import { DatePickerModule } from 'primeng/datepicker';
// import th from 'primeng/resources/locale/th.json';

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
    TooltipModule,
    DatePickerModule
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

startDate: Date | null = null;
endDate: Date | null = null;


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
    // const today = new Date();
    // today.setHours(0, 0, 0, 0);
  }

  formatDateToYYYYMMDD(date: Date | null): string | null {
    if (!date) return null;
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }



  loadFinanceRecords(queryParams: FinanceQueryParams = {}): void {
    console.log('loadFinanceRecords called ✅');
    this.loading = true;
    console.log(this.selectedCategory)
    console.log('startDate', this.startDate)
    console.log('endDate', this.endDate)

    const formattedStart = this.startDate ? this.formatDateToYYYYMMDD(this.startDate) : null;
    const formattedEnd = this.endDate     ? this.formatDateToYYYYMMDD(this.endDate) : null;


    this.financeService.getFinanceRecords({
      page: this.currentPage + 1,
      limit: this.pageSize,
      search: this.searchTerm,
      category: this.selectedCategory || undefined,
      start_date: formattedStart || undefined,
      end_date: formattedEnd || undefined,
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


  navigateToAdd(): void {
    this.router.navigate(['/finance/form']);
  }

  navigateToSummary(): void {
    this.router.navigate(['/finance/summary']);
  }

  editRecord(record: FinanceRecord): void {
    this.router.navigate(['/finance/form', record.id]);
  }

  confirmDelete(event: Event, record: FinanceRecord): void {
    this.confirmationService.confirm({
      target: event.target as EventTarget, // ✅ ให้ popup ลอยตรงปุ่ม
      message: `คุณต้องการลบรายการ "${record.item_name}" ใช่หรือไม่?`,
      header: 'ยืนยันการลบ',
      icon: 'pi pi-exclamation-triangle',
      rejectButtonProps: {
        label: 'ยกเลิก',
        severity: 'secondary',
        outlined: true
      },
      acceptButtonProps: {
        label: 'ลบ',
        severity: 'danger'
      },
      accept: () => {
        this.deleteRecord(record);
        // this.messageService.add({
        //   severity: 'success',
        //   summary: 'สำเร็จ',
        //   detail: 'ลบรายการเรียบร้อยแล้ว'
        // });
      },
      reject: () => {
        this.messageService.add({
          severity: 'info',
          summary: 'ยกเลิก',
          detail: 'การลบถูกยกเลิก'
        });
      }
    });
  }

  // confirmDelete(record: FinanceRecord): void {
  //   this.confirmationService.confirm({
  //     message: `คุณต้องการลบรายการ "${record.item_name}" ใช่หรือไม่?`,
  //     header: 'ยืนยันการลบ',
  //     icon: 'pi pi-exclamation-triangle',
  //     acceptLabel: 'ลบ',
  //     rejectLabel: 'ยกเลิก',
  //     accept: () => {
  //       this.deleteRecord(record);
  //     },
  //     reject: () => {
  //       // optional: ทำอะไรเพิ่มเวลายกเลิก
  //     }
  //   });
  // }


  deleteRecord(record: FinanceRecord): void {
    console.log(record);
    console.log(record['id']);
    const id: number = record?.['id'] ?? 0;
    this.loading = true;
    this.financeService.deleteFinanceRecord(id).subscribe({
      next: (res) => {
        if (res.success) {

          //////////////  DATA //////////////
          setTimeout(() => {
            this.loadFinanceRecords();
            this.messageService.add({
              severity: 'success',
              summary: 'สำเร็จ',
              detail: 'ลบรายการเรียบร้อยแล้ว'
            });
          }, 1000);
          ////////////////////////////////////
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'ล้มเหลว',
            detail: 'ข้อมูลผิดพลาด'
          });
          this.loading = false;
        }
      },
      error: (err) => {
        console.error('API Error:', err);
        // this.showError('ไม่สามารถบันทึกรายการได้ กรุณาลองใหม่อีกครั้ง');
        this.loading = false;
      }
    });

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

    this.startDate  = null;
    this.endDate    = null;
    
    this.loadFinanceRecords();
  }

  private applyFilters(): void {
    // Apply filters logic here - For now just reload data
    this.loadFinanceRecords();
  }

  // Utility methods
  getCategoryLabel(category: string): string {
    return category === 'income' ? 'รายรับ' : 'รายจ่าย';
  }

  getCategorySeverity(category: string): NonNullable<Tag['severity']> {
    switch (category) {
      case 'income': return 'success';
      case 'expense': return 'danger';
      default: return 'info';
    }
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


  getTodaySummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let income = 0;
    let expense = 0;

    this.financeRecords.forEach(record => {
      const recordDate = new Date(record.record_date);
      recordDate.setHours(0, 0, 0, 0);

      if (recordDate.getTime() === today.getTime()) {
        if (record.category === 'income') {
          income += record.amount;
        } else if (record.category === 'expense') {
          expense += record.amount;
        }
      }
    });
    return { income, expense, net: income - expense };
  }

  getLastMonthSummary() {
    const now = new Date();

    // หาวันแรกและวันสุดท้ายของเดือนที่แล้ว
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0); // วันที่ 0 ของเดือนนี้ = วันสุดท้ายของเดือนที่แล้ว

    // set เวลาให้ตรงกัน (ป้องกัน timezone)
    firstDayLastMonth.setHours(0, 0, 0, 0);
    lastDayLastMonth.setHours(23, 59, 59, 999);

    let income = 0;
    let expense = 0;

    this.financeRecords.forEach(record => {
      const recordDate = new Date(record.record_date);
      recordDate.setHours(0, 0, 0, 0);

      // ตรวจว่าข้อมูลอยู่ในช่วงเดือนที่แล้ว
      if (recordDate >= firstDayLastMonth && recordDate <= lastDayLastMonth) {
        if (record.category === 'income') {
          income += record.amount;
        } else if (record.category === 'expense') {
          expense += record.amount;
        }
      }
    });

    return {
      income,
      expense,
      net: income - expense,
      period: `${firstDayLastMonth.toLocaleDateString()} - ${lastDayLastMonth.toLocaleDateString()}`
    };
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
