import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';

import { ApiClientService } from '../../core/services/api-client.service';
import { ApiClient, ApiClientWithSecret, ApiScopeInfo } from '../../core/models/api-client.model';

// จัดการระบบภายนอกที่เรียก API ได้ (admin) — secret แสดงครั้งเดียวตอนสร้าง/สร้างใหม่
@Component({
  selector: 'app-api-client-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ButtonModule, DialogModule, InputTextModule, ToastModule, TooltipModule, ConfirmDialogModule],
  templateUrl: './api-client-list.html',
  styleUrls: ['../../ui/styles/list-page.scss', './api-client-list.scss'],
  providers: [MessageService, ConfirmationService],
})
export class ApiClientListComponent implements OnInit {
  clients: ApiClient[] = [];
  scopes: ApiScopeInfo[] = [];
  loading = false;

  // สร้างใหม่
  showCreate = false;
  saving = false;
  form = { name: '', scopes: [] as string[], expires_at: '', note: '' };

  // แสดง secret ครั้งเดียว
  revealed: ApiClientWithSecret | null = null;
  copied = '';

  readonly apiBase = `${location.origin}/api/v1`;
  // วันนี้ตามเวลาเครื่อง (YYYY-MM-DD) — กันเลือกวันหมดอายุย้อนหลัง
  readonly today = new Date().toLocaleDateString('sv-SE');

  constructor(
    private api: ApiClientService,
    private messages: MessageService,
    private confirm: ConfirmationService,
  ) {}

  ngOnInit(): void {
    this.api.scopes().subscribe({ next: (res) => (this.scopes = res.data) });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.list().subscribe({
      next: (res) => {
        this.clients = res.data;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toastError(err);
      },
    });
  }

  openCreate(): void {
    this.form = { name: '', scopes: this.scopes.length ? [this.scopes[0].key] : [], expires_at: '', note: '' };
    this.showCreate = true;
  }

  toggleScope(key: string): void {
    this.form.scopes = this.form.scopes.includes(key) ? this.form.scopes.filter((s) => s !== key) : [...this.form.scopes, key];
  }

  create(): void {
    if (!this.form.name.trim() || !this.form.scopes.length) {
      this.messages.add({ severity: 'warn', summary: 'กรอกไม่ครบ', detail: 'ตั้งชื่อ และเลือกสิทธิ์อย่างน้อย 1 อย่าง' });
      return;
    }
    this.saving = true;
    this.api
      .create({ name: this.form.name.trim(), scopes: this.form.scopes, expires_at: this.form.expires_at || null, note: this.form.note || null })
      .subscribe({
        next: (res) => {
          this.saving = false;
          this.showCreate = false;
          this.reveal(res.data);
          this.load();
        },
        error: (err) => {
          this.saving = false;
          this.toastError(err);
        },
      });
  }

  toggleActive(c: ApiClient): void {
    this.api.update(c.id, { is_active: !c.is_active }).subscribe({
      next: (res) => {
        Object.assign(c, res.data);
        this.messages.add({ severity: 'success', summary: c.is_active ? 'เปิดใช้งานแล้ว' : 'ปิดใช้งานแล้ว', detail: c.is_active ? c.name : `${c.name} — token ที่ออกไปใช้ไม่ได้ทันที` });
      },
      error: (err) => this.toastError(err),
    });
  }

  // ----- วันหมดอายุ -----
  expiryTarget: ApiClient | null = null;
  expiryDate = '';

  openExpiry(c: ApiClient): void {
    this.expiryTarget = c;
    // วันที่เดิม (ถ้ายังไม่หมด) ตามเวลาไทย
    this.expiryDate = c.expires_at && !c.is_expired ? new Date(c.expires_at).toLocaleDateString('sv-SE') : '';
  }

  saveExpiry(date: string | null): void {
    const c = this.expiryTarget;
    if (!c) return;
    this.api.update(c.id, { expires_at: date }).subscribe({
      next: (res) => {
        Object.assign(c, res.data);
        this.expiryTarget = null;
        this.messages.add({ severity: 'success', summary: 'บันทึกแล้ว', detail: date ? `${c.name} ใช้ได้ถึง ${this.formatDate(c.expires_at)}` : `${c.name} ไม่มีวันหมดอายุ` });
      },
      error: (err) => this.toastError(err),
    });
  }

  confirmRotate(c: ApiClient): void {
    this.confirm.confirm({
      header: 'สร้าง secret ใหม่',
      message: `secret เดิมของ "${c.name}" จะใช้ขอ token ไม่ได้อีก — ต้องส่ง secret ใหม่ให้ผู้เชื่อมต่อ ดำเนินการต่อไหม?`,
      icon: 'pi pi-refresh',
      rejectButtonProps: { label: 'ยกเลิก', severity: 'secondary', outlined: true },
      acceptButtonProps: { label: 'สร้าง secret ใหม่', severity: 'warn' },
      accept: () => this.api.rotateSecret(c.id).subscribe({ next: (res) => this.reveal(res.data), error: (err) => this.toastError(err) }),
    });
  }

  confirmDelete(c: ApiClient): void {
    this.confirm.confirm({
      header: 'ลบ API client',
      message: `ลบ "${c.name}" ถาวร? ระบบนี้จะเรียก API ไม่ได้อีก (ถ้าแค่พักไว้ ให้ปิดใช้งานแทน)`,
      icon: 'pi pi-trash',
      rejectButtonProps: { label: 'ไม่ลบ', severity: 'secondary', outlined: true },
      acceptButtonProps: { label: 'ลบ', severity: 'danger' },
      accept: () =>
        this.api.remove(c.id).subscribe({
          next: () => {
            this.messages.add({ severity: 'success', summary: 'ลบแล้ว', detail: c.name });
            this.load();
          },
          error: (err) => this.toastError(err),
        }),
    });
  }

  async copy(text: string, what: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.copied = what;
      setTimeout(() => (this.copied = ''), 1500);
    } catch {
      this.messages.add({ severity: 'warn', summary: 'คัดลอกไม่ได้', detail: 'เลือกข้อความแล้วกด Ctrl+C แทน' });
    }
  }

  scopeLabel(key: string): string {
    return this.scopes.find((s) => s.key === key)?.description || key;
  }

  statusChip(c: ApiClient): { label: string; cls: string } {
    if (!c.is_active) return { label: 'ปิดใช้งาน', cls: 'chip-plain' };
    if (c.is_expired) return { label: 'หมดอายุ', cls: 'chip-warn' };
    return { label: 'ใช้งาน', cls: 'chip-accent' };
  }

  formatDate(d?: string | null): string {
    if (!d) return '—';
    return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(d));
  }

  private reveal(data: ApiClientWithSecret): void {
    this.revealed = data;
    this.copied = '';
  }

  private toastError(err: any): void {
    const msg = err?.error?.message;
    this.messages.add({ severity: 'error', summary: 'ผิดพลาด', detail: Array.isArray(msg) ? msg.join(', ') : msg || err.message });
  }
}
