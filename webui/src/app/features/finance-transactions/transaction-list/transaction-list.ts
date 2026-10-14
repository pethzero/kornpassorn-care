import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { Tag, TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { LoadingSpinnerComponent } from '../../../ui/loading-spinner/loading-spinner';
import { afterMinDuration } from '../../../core/utils/min-duration';
import { FinanceTransactionService } from '../../../core/services/finance-transaction.service';
import { FinanceTransaction, FinanceTransactionSummary, TransactionDocType, TransactionStatus } from '../../../core/models/finance-transaction.model';

@Component({
  selector: 'app-transaction-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TagModule,
    ToastModule,
    LoadingSpinnerComponent,
  ],
  templateUrl: './transaction-list.html',
  styleUrls: ['./transaction-list.scss'],
  providers: [MessageService],
})
export class TransactionListComponent implements OnInit {
  transactions: FinanceTransaction[] = [];
  loading = false;

  summary: FinanceTransactionSummary | null = null;
  summaryLoading = false;

  currentPage = 0;
  pageSize = 10;
  totalRecords = 0;

  filters = {
    doc_type: '',
    status: '',
    start_date: '',
    end_date: '',
    search: '',
  };

  docTypeOptions = [
    { label: 'ทุกประเภท', value: '' },
    { label: '🛒 ขายสินค้า', value: 'sale' },
    { label: '📦 ซื้อสินค้า', value: 'purchase' },
    { label: '🩺 บริการคนไข้', value: 'patient_service' },
    { label: '💰 รายรับ', value: 'income' },
    { label: '💸 รายจ่าย', value: 'expense' },
    { label: 'ผสม', value: 'mixed' },
  ];

  statusOptions = [
    { label: 'ทุกสถานะ', value: '' },
    { label: 'ยืนยันแล้ว', value: 'confirmed' },
    { label: 'ร่าง', value: 'draft' },
    { label: 'ยกเลิก', value: 'void' },
  ];

  constructor(
    private router: Router,
    private financeTransactionService: FinanceTransactionService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.load();
    this.loadSummary();
  }

  loadSummary(): void {
    this.summaryLoading = true;
    this.financeTransactionService.getSummary().subscribe({
      next: (res) => {
        this.summary = res.data;
        this.summaryLoading = false;
      },
      error: () => {
        this.summaryLoading = false;
      },
    });
  }

  load(): void {
    this.loading = true;
    const startedAt = Date.now();
    this.financeTransactionService
      .getTransactions({
        page: this.currentPage + 1,
        limit: this.pageSize,
        doc_type: (this.filters.doc_type || undefined) as TransactionDocType | undefined,
        status: (this.filters.status || undefined) as TransactionStatus | undefined,
        start_date: this.filters.start_date || undefined,
        end_date: this.filters.end_date || undefined,
        search: this.filters.search || undefined,
      })
      .subscribe({
        next: (res) => {
          afterMinDuration(startedAt, () => {
            this.transactions = res.data;
            this.totalRecords = res.meta.total;
            this.loading = false;
          });
        },
        error: (err) => {
          afterMinDuration(startedAt, () => {
            this.loading = false;
            this.messageService.add({
              severity: 'error',
              summary: 'ผิดพลาด',
              detail: 'โหลดข้อมูลไม่สำเร็จ: ' + (err.error?.message || err.message),
            });
          });
        },
      });
  }

  onPage(event: TableLazyLoadEvent): void {
    const first = event.first ?? 0;
    const rows = event.rows ?? this.pageSize;
    this.currentPage = first / rows;
    this.pageSize = rows;
    this.load();
  }

  applyFilters(): void {
    this.currentPage = 0;
    this.load();
  }

  clearFilters(): void {
    this.filters = { doc_type: '', status: '', start_date: '', end_date: '', search: '' };
    this.currentPage = 0;
    this.load();
  }

  navigateToCreate(): void {
    this.router.navigate(['/finance-transactions/form']);
  }

  viewTransaction(transaction: FinanceTransaction): void {
    this.router.navigate(['/finance-transactions', transaction.id]);
  }

  docTypeLabel(docType: string): string {
    return this.docTypeOptions.find((o) => o.value === docType)?.label || docType;
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'confirmed':
        return 'ยืนยันแล้ว';
      case 'void':
        return 'ยกเลิก';
      default:
        return 'ร่าง';
    }
  }

  statusSeverity(status: string): NonNullable<Tag['severity']> {
    switch (status) {
      case 'confirmed':
        return 'success';
      case 'void':
        return 'danger';
      default:
        return 'warn';
    }
  }

  formatCurrency(amount?: number): string {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount || 0);
  }

  formatDate(date?: string): string {
    if (!date) return '-';
    return new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date));
  }
}
