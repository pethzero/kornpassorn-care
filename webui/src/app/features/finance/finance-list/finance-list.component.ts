import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';

import { FinanceService } from '../../../core/services/finance.service';
import { FinanceRecord, FinanceSummary } from '../../../core/models/finance.model';
import { documentTypeInfo } from '../../../core/models/document.model';
import { FinanceRecordDialogComponent } from '../finance-record-dialog/finance-record-dialog';

type Period = 'this_month' | 'last_month' | 'last_3_months' | 'this_year' | 'all' | 'custom';

@Component({
  selector: 'app-finance-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TableModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    FinanceRecordDialogComponent,
  ],
  templateUrl: './finance-list.component.html',
  styleUrls: ['../../../ui/styles/list-page.scss', './finance-list.component.scss'],
  providers: [MessageService, ConfirmationService],
})
export class FinanceListComponent implements OnInit {
  records: FinanceRecord[] = [];
  summary: FinanceSummary | null = null;
  loading = false;
  totalRecords = 0;
  first = 0;
  rows = 15;

  period: Period = 'this_month';
  startDate = '';
  endDate = '';
  category: 'income' | 'expense' | '' = '';
  source: 'document' | 'manual' | '' = '';
  searchTerm = '';

  showDialog = false;
  editing: FinanceRecord | null = null;

  readonly periods: { value: Period; label: string }[] = [
    { value: 'this_month', label: 'เดือนนี้' },
    { value: 'last_month', label: 'เดือนก่อน' },
    { value: 'last_3_months', label: '3 เดือน' },
    { value: 'this_year', label: 'ปีนี้' },
    { value: 'all', label: 'ทั้งหมด' },
    { value: 'custom', label: 'กำหนดเอง' },
  ];
  readonly sourceOptions = [
    { label: 'ทุกที่มา', value: '' },
    { label: 'จากเอกสาร', value: 'document' },
    { label: 'บันทึกเอง', value: 'manual' },
  ];

  constructor(
    private financeService: FinanceService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.applyPeriod('this_month', false);

    // /finance/form เดิม redirect มาที่นี่: ?new=1 = เพิ่ม, ?edit=<id> = แก้ไข
    // subscribe (ไม่ใช่ snapshot) เพราะกดเมนู "บันทึก..." ขณะอยู่หน้านี้ component จะถูกใช้ซ้ำ ไม่ผ่าน ngOnInit ใหม่
    this.route.queryParamMap.subscribe((qp) => {
      if (qp.get('new')) this.openCreate();
      if (qp.get('edit')) {
        this.financeService.getFinanceRecord(Number(qp.get('edit'))).subscribe({
          next: (res) => this.openEdit(res.data),
        });
      }
      if (qp.get('new') || qp.get('edit')) {
        this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
      }
    });
  }

  // ----- ช่วงเวลา -----

  applyPeriod(period: Period, reload = true): void {
    this.period = period;
    const now = new Date();
    const ymd = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const y = now.getFullYear();
    const m = now.getMonth();
    switch (period) {
      case 'this_month':
        [this.startDate, this.endDate] = [ymd(new Date(y, m, 1)), ymd(new Date(y, m + 1, 0))];
        break;
      case 'last_month':
        [this.startDate, this.endDate] = [ymd(new Date(y, m - 1, 1)), ymd(new Date(y, m, 0))];
        break;
      case 'last_3_months':
        [this.startDate, this.endDate] = [ymd(new Date(y, m - 2, 1)), ymd(new Date(y, m + 1, 0))];
        break;
      case 'this_year':
        [this.startDate, this.endDate] = [ymd(new Date(y, 0, 1)), ymd(new Date(y, 11, 31))];
        break;
      case 'all':
        [this.startDate, this.endDate] = ['', ''];
        break;
      case 'custom':
        // ใช้ค่าวันที่ที่กรอกเองอยู่แล้ว
        break;
    }
    if (reload) this.reload();
    else this.loadSummary();
  }

  onCustomDateChange(): void {
    this.period = 'custom';
    this.reload();
  }

  setCategory(category: 'income' | 'expense' | ''): void {
    this.category = category;
    this.reload();
  }

  // ----- โหลดข้อมูล -----

  reload(): void {
    this.first = 0;
    this.loadRecords();
    this.loadSummary();
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? this.rows;
    this.loadRecords();
  }

  private loadRecords(): void {
    this.loading = true;
    this.financeService
      .getFinanceRecords({
        page: Math.floor(this.first / this.rows) + 1,
        limit: this.rows,
        search: this.searchTerm || undefined,
        category: this.category || undefined,
        source: this.source || undefined,
        start_date: this.startDate || undefined,
        end_date: this.endDate || undefined,
      })
      .subscribe({
        next: (res) => {
          this.records = res.data;
          this.totalRecords = res.meta.total;
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.messageService.add({ severity: 'error', summary: 'ผิดพลาด', detail: err.error?.message || 'โหลดข้อมูลไม่สำเร็จ' });
        },
      });
  }

  // ยอดรวมของช่วงเวลาที่เลือก (ทุกหน้า) — เดิมรวมจากแถวที่แสดงในหน้าเดียว ทำให้ยอดผิด
  private loadSummary(): void {
    this.financeService.getSummary(this.startDate || undefined, this.endDate || undefined).subscribe({
      next: (res) => (this.summary = res.data),
    });
  }

  // ----- เพิ่ม / แก้ / ลบ (เฉพาะรายการที่บันทึกเอง) -----

  openCreate(): void {
    this.editing = null;
    this.showDialog = true;
  }

  openEdit(record: FinanceRecord): void {
    if (record.document_id) return;
    this.editing = record;
    this.showDialog = true;
  }

  onSaved(message: string): void {
    this.messageService.add({ severity: 'success', summary: 'สำเร็จ', detail: message });
    this.reload();
  }

  confirmDelete(record: FinanceRecord): void {
    this.confirmationService.confirm({
      header: 'ลบรายการ',
      message: `ลบ "${record.item_name}" ${this.formatMoney(record.amount)} ใช่หรือไม่?`,
      icon: 'pi pi-trash',
      rejectButtonProps: { label: 'ไม่ลบ', severity: 'secondary', outlined: true },
      acceptButtonProps: { label: 'ลบรายการ', severity: 'danger' },
      accept: () => {
        this.financeService.deleteFinanceRecord(record.id!).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'ลบแล้ว', detail: record.item_name });
            this.reload();
          },
          error: (err) =>
            this.messageService.add({ severity: 'error', summary: 'ลบไม่สำเร็จ', detail: err.error?.message || err.message }),
        });
      },
    });
  }

  // ----- แสดงผล -----

  // ที่มา: ประเภทเอกสาร หรือ "บันทึกเอง"
  sourceLabel(record: FinanceRecord): string {
    return record.document ? documentTypeInfo(record.document.doc_type).label : 'บันทึกเอง';
  }

  sourceTotal(category: 'income' | 'expense', kind: 'document' | 'manual'): number {
    return (this.summary?.by_source || [])
      .filter((s) => s.category === category && (kind === 'manual' ? s.source === 'manual' : s.source !== 'manual'))
      .reduce((sum, s) => sum + s.total, 0);
  }

  periodLabel(): string {
    if (!this.startDate && !this.endDate) return 'ทั้งหมด';
    return `${this.formatDate(this.startDate)} – ${this.formatDate(this.endDate)}`;
  }

  num(value: unknown): number {
    return Number(value) || 0;
  }

  formatMoney(value: unknown): string {
    return '฿' + this.num(value).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatDate(date?: string | Date | null): string {
    if (!date) return '…';
    return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }).format(new Date(date));
  }
}
