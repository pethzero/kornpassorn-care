import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { LoadingSpinnerComponent } from '../../../ui/loading-spinner/loading-spinner';
import { DocumentService } from '../../../core/services/document.service';
import { ClinicDocument, DocumentItem, documentTypeInfo } from '../../../core/models/document.model';

@Component({
  selector: 'app-document-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ButtonModule, DialogModule, InputTextModule, ToastModule, LoadingSpinnerComponent],
  templateUrl: './document-detail.html',
  styleUrls: ['../../../ui/styles/list-page.scss', './document-detail.scss'],
  providers: [MessageService],
})
export class DocumentDetailComponent implements OnInit {
  doc: ClinicDocument | null = null;
  loading = false;

  showVoidDialog = false;
  voidReason = '';
  voiding = false;

  readonly typeInfo = documentTypeInfo;

  constructor(
    private route: ActivatedRoute,
    private documentService: DocumentService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    // toast จากหน้าสร้างเอกสาร (ส่งมาทาง router state)
    const state = history.state as { toast?: { severity: string; summary: string; detail: string } } | undefined;
    if (state?.toast) {
      setTimeout(() => this.messageService.add(state.toast!));
      history.replaceState({ ...history.state, toast: undefined }, '');
    }
    this.route.paramMap.subscribe((params) => this.load(Number(params.get('id'))));
  }

  private load(id: number): void {
    this.loading = true;
    this.documentService.getDocument(id).subscribe({
      next: (res) => {
        this.doc = res.data;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.messageService.add({ severity: 'error', summary: 'ผิดพลาด', detail: err.error?.message || err.message });
      },
    });
  }

  confirmVoid(): void {
    if (!this.doc) return;
    this.voiding = true;
    this.documentService.voidDocument(this.doc.id, this.voidReason || undefined).subscribe({
      next: (res) => {
        this.voiding = false;
        this.showVoidDialog = false;
        this.doc = res.data;
        this.messageService.add({ severity: 'success', summary: 'ยกเลิกแล้ว', detail: res.message });
      },
      error: (err) => {
        this.voiding = false;
        this.messageService.add({ severity: 'error', summary: 'ยกเลิกไม่สำเร็จ', detail: err.error?.message || err.message, life: 6000 });
      },
    });
  }

  hasMoney(): boolean {
    return !!this.doc && (this.doc.doc_type === 'receive' || this.doc.doc_type === 'patient_service');
  }

  itemName(item: DocumentItem): string {
    if (item.item_type === 'service') return item.category || item.description || 'ค่าบริการ';
    // สินค้าที่ถูกลบไปแล้ว: ชื่อถูกเก็บไว้ใน description ตอนลบ
    return item.product?.name || item.description || `สินค้า #${item.product_id}`;
  }

  // บรรทัดรองใต้ชื่อ: ยี่ห้อ/ล็อต/หมายเหตุ
  itemSub(item: DocumentItem): string {
    const parts: string[] = [];
    if (item.package) parts.push(item.package.brand);
    if (item.product_lot) parts.push(`ล็อต ${item.product_lot.lot_no}`);
    // บริการ: คำอธิบายที่กรอก / สินค้า: หมายเหตุบรรทัด (สินค้าที่ถูกลบแล้ว ชื่ออยู่ใน description จึงไม่ซ้ำแสดง)
    if (item.description && (item.product || item.item_type === 'service')) parts.push(item.description);
    return parts.join(' · ');
  }

  qtyText(item: DocumentItem): string {
    if (item.item_type === 'service') return item.quantity ? `${Number(item.quantity)} ครั้ง` : '';
    const unit = item.product?.unit || '';
    const qty = Number(item.quantity) || 0;
    const sign = this.doc?.doc_type === 'adjust' ? (item.direction === 'in' ? '+' : '−') : '';
    if (item.pack_qty && item.package) {
      return `${Number(item.pack_qty)} ${item.package.pack_unit} (${qty.toLocaleString('th-TH')} ${unit})`;
    }
    return `${sign}${qty.toLocaleString('th-TH')} ${unit}`;
  }

  stockEffect(): string {
    switch (this.doc?.doc_type) {
      case 'receive':
        return 'สต็อกเข้า';
      case 'adjust':
        return 'ปรับสต็อก';
      default:
        return 'ตัดสต็อก';
    }
  }

  num(value: unknown): number {
    return Number(value) || 0;
  }

  formatDate(date?: string | null, withTime = false): string {
    if (!date) return '-';
    return new Intl.DateTimeFormat('th-TH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    }).format(new Date(date));
  }
}
