import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { Tag, TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

import { LoadingSpinnerComponent } from '../../../ui/loading-spinner/loading-spinner';
import { afterMinDuration } from '../../../core/utils/min-duration';
import { FinanceTransactionService } from '../../../core/services/finance-transaction.service';
import { FinanceTransaction } from '../../../core/models/finance-transaction.model';

@Component({
  selector: 'app-transaction-detail',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
    LoadingSpinnerComponent,
  ],
  templateUrl: './transaction-detail.html',
  styleUrls: ['./transaction-detail.scss'],
  providers: [MessageService, ConfirmationService],
})
export class TransactionDetailComponent implements OnInit {
  transaction: FinanceTransaction | null = null;
  loading = false;
  voiding = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private financeTransactionService: FinanceTransactionService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) {}

  ngOnInit(): void {
    const state = history.state as { toast?: { severity: string; summary: string; detail: string } } | undefined;
    if (state?.toast) {
      this.messageService.add(state.toast);
      history.replaceState({ ...history.state, toast: undefined }, '');
    }

    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.load(id);
  }

  private load(id: number): void {
    this.loading = true;
    const startedAt = Date.now();
    this.financeTransactionService.getTransaction(id).subscribe({
      next: (res) => {
        afterMinDuration(startedAt, () => {
          this.transaction = res.data;
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

  confirmVoid(event: Event): void {
    if (!this.transaction) return;
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: `คุณต้องการยกเลิกเอกสาร "${this.transaction.doc_no}" ใช่หรือไม่? ระบบจะคืนสต็อกที่ถูกตัด/เติมไปทั้งหมด`,
      header: 'ยืนยันการยกเลิกเอกสาร',
      icon: 'pi pi-exclamation-triangle',
      rejectButtonProps: { label: 'ปิด', severity: 'secondary', outlined: true },
      acceptButtonProps: { label: 'ยกเลิกเอกสาร', severity: 'danger' },
      accept: () => this.voidTransaction(),
    });
  }

  private voidTransaction(): void {
    if (!this.transaction?.id || this.voiding) return;
    this.voiding = true;
    const startedAt = Date.now();
    this.financeTransactionService.voidTransaction(this.transaction.id).subscribe({
      next: (res) => {
        afterMinDuration(startedAt, () => {
          this.voiding = false;
          this.transaction = res.data;
          this.messageService.add({ severity: 'success', summary: 'สำเร็จ', detail: 'ยกเลิกเอกสารเรียบร้อยแล้ว' });
        });
      },
      error: (err) => {
        afterMinDuration(startedAt, () => {
          this.voiding = false;
          this.messageService.add({
            severity: 'error',
            summary: 'ผิดพลาด',
            detail: 'ยกเลิกไม่สำเร็จ: ' + (err.error?.message || err.message),
          });
        });
      },
    });
  }

  back(): void {
    this.router.navigate(['/finance-transactions/list']);
  }

  directionLabel(direction: string): string {
    return direction === 'in' ? 'รับเงิน' : 'จ่ายเงิน';
  }

  itemTypeLabel(itemType?: string): string {
    switch (itemType) {
      case 'product':
        return 'สินค้า';
      case 'service':
        return 'บริการ';
      default:
        return 'อื่นๆ';
    }
  }

  docTypeLabel(docType?: string): string {
    switch (docType) {
      case 'sale':
        return '🛒 ขายสินค้า';
      case 'purchase':
        return '📦 ซื้อสินค้า';
      case 'patient_service':
        return '🩺 บริการคนไข้';
      case 'income':
        return '💰 รายรับ';
      case 'expense':
        return '💸 รายจ่าย';
      default:
        return 'ผสม';
    }
  }

  statusLabel(status?: string): string {
    switch (status) {
      case 'confirmed':
        return 'ยืนยันแล้ว';
      case 'void':
        return 'ยกเลิก';
      default:
        return 'ร่าง';
    }
  }

  statusSeverity(status?: string): NonNullable<Tag['severity']> {
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
