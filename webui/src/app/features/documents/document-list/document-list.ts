import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

import { LoadingSpinnerComponent } from '../../../ui/loading-spinner/loading-spinner';
import { afterMinDuration } from '../../../core/utils/min-duration';
import { DocumentService } from '../../../core/services/document.service';
import {
  ClinicDocument,
  DOCUMENT_TYPE_INFO,
  DocumentStatus,
  DocumentSummary,
  DocumentType,
  documentTypeInfo,
} from '../../../core/models/document.model';

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    ToastModule,
    TooltipModule,
    LoadingSpinnerComponent,
  ],
  templateUrl: './document-list.html',
  styleUrls: ['../../../ui/styles/list-page.scss', './document-list.scss'],
  providers: [MessageService],
})
export class DocumentListComponent implements OnInit {
  documents: ClinicDocument[] = [];
  summary: DocumentSummary | null = null;
  loading = false;

  readonly types = DOCUMENT_TYPE_INFO;
  readonly typeInfo = documentTypeInfo;

  selectedType: DocumentType | '' = '';
  selectedStatus: DocumentStatus | '' = '';
  searchTerm = '';
  startDate = '';
  endDate = '';

  statusOptions = [
    { label: 'ทุกสถานะ', value: '' },
    { label: 'ใช้งาน', value: 'confirmed' },
    { label: 'ยกเลิกแล้ว', value: 'void' },
  ];

  constructor(
    private documentService: DocumentService,
    private messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const type = this.route.snapshot.queryParamMap.get('type') as DocumentType | null;
    if (type && DOCUMENT_TYPE_INFO.some((t) => t.value === type)) this.selectedType = type;
    this.load();
    this.documentService.getSummary().subscribe({ next: (res) => (this.summary = res.data) });
  }

  load(): void {
    this.loading = true;
    const startedAt = Date.now();
    this.documentService
      .getDocuments({
        doc_type: this.selectedType || undefined,
        status: this.selectedStatus || undefined,
        search: this.searchTerm || undefined,
        start_date: this.startDate || undefined,
        end_date: this.endDate || undefined,
        limit: 200,
      })
      .subscribe({
        next: (res) =>
          afterMinDuration(startedAt, () => {
            this.documents = res.data;
            this.loading = false;
          }),
        error: (err) =>
          afterMinDuration(startedAt, () => {
            this.loading = false;
            this.messageService.add({
              severity: 'error',
              summary: 'ผิดพลาด',
              detail: 'โหลดเอกสารไม่สำเร็จ: ' + (err.error?.message || err.message),
            });
          }),
      });
  }

  selectType(type: DocumentType | ''): void {
    this.selectedType = type;
    this.router.navigate([], { relativeTo: this.route, queryParams: { type: type || null }, replaceUrl: true });
    this.load();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = '';
    this.startDate = '';
    this.endDate = '';
    this.selectType('');
  }

  newDocument(type: DocumentType): void {
    this.router.navigate(['/documents/new'], { queryParams: { type } });
  }

  open(doc: ClinicDocument): void {
    this.router.navigate(['/documents', doc.id]);
  }

  // คำอธิบายสั้นๆ ของเอกสาร: คนไข้ / ผู้ขาย / เหตุผล
  partyLine(doc: ClinicDocument): string {
    if (doc.doc_type === 'patient_service' && doc.patient) {
      return `${doc.patient.first_name} ${doc.patient.last_name}`.trim();
    }
    if (doc.doc_type === 'receive') return doc.supplier || 'ไม่ระบุผู้ขาย';
    return doc.reason || '-';
  }

  typeChipClass(type: DocumentType): string {
    switch (type) {
      case 'receive':
        return 'chip-info';
      case 'patient_service':
        return 'chip-accent';
      case 'adjust':
        return 'chip-warn';
      default:
        return '';
    }
  }

  formatDate(date?: string | null): string {
    if (!date) return '-';
    return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }).format(new Date(date));
  }

  num(value: unknown): number {
    return Number(value) || 0;
  }
}
