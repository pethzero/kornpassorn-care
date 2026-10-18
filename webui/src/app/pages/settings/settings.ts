import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

import { AuthService } from '../../core/services/auth.service';
import { ClinicSettings, Session, SettingsService, StaffUser } from '../../core/services/settings.service';

type Tab = 'account' | 'sessions' | 'users' | 'clinic';

// ตั้งค่า: บัญชีของฉัน / อุปกรณ์ที่ login (ทุกคน) + ผู้ใช้งาน / คลินิก & บริการ (admin)
@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ButtonModule, DialogModule, InputTextModule, InputNumberModule, ToastModule, TooltipModule],
  templateUrl: './settings.html',
  styleUrls: ['../../ui/styles/list-page.scss', './settings.scss'],
  providers: [MessageService],
})
export class SettingsComponent implements OnInit {
  tab: Tab = 'account';
  isAdmin = false;

  // บัญชีของฉัน
  account: Partial<StaffUser> = {};
  savingAccount = false;
  pw = { current: '', next: '', confirm: '' };
  savingPw = false;

  // อุปกรณ์
  sessions: Session[] = [];

  // ผู้ใช้ (admin)
  users: StaffUser[] = [];
  showUserDialog = false;
  editingUser: StaffUser | null = null;
  userForm = { username: '', password: '', role: 'user' as 'admin' | 'user', first_name: '', last_name: '', email: '', phone_number: '' };
  savingUser = false;
  resetTarget: StaffUser | null = null;
  resetPw = '';
  myId = '';

  // คลินิก (admin)
  clinic: ClinicSettings | null = null;
  savingClinic = false;

  constructor(
    private settings: SettingsService,
    private auth: AuthService,
    private messages: MessageService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  get tabs(): { key: Tab; label: string; icon: string }[] {
    return [
      { key: 'account', label: 'บัญชีของฉัน', icon: 'pi pi-user' },
      { key: 'sessions', label: 'อุปกรณ์ที่เข้าสู่ระบบ', icon: 'pi pi-desktop' },
      ...(this.isAdmin
        ? [
            { key: 'users' as Tab, label: 'ผู้ใช้งาน', icon: 'pi pi-users' },
            { key: 'clinic' as Tab, label: 'คลินิก & บริการ', icon: 'pi pi-building' },
          ]
        : []),
    ];
  }

  ngOnInit(): void {
    this.isAdmin = this.auth.getCurrentUser()?.role === 'admin';
    const t = this.route.snapshot.queryParamMap.get('tab') as Tab | null;
    this.open(t && this.tabs.some((x) => x.key === t) ? t : 'account');
  }

  open(tab: Tab): void {
    this.tab = tab;
    this.router.navigate([], { relativeTo: this.route, queryParams: { tab }, replaceUrl: true });
    if (tab === 'account') this.loadAccount();
    if (tab === 'sessions') this.loadSessions();
    if (tab === 'users') this.loadUsers();
    if (tab === 'clinic') this.loadClinic();
  }

  // ===== บัญชีของฉัน =====

  loadAccount(): void {
    this.settings.getAccount().subscribe({
      next: (r) => {
        this.account = { ...r.data };
        this.myId = r.data.id;
      },
      error: (e) => this.err(e),
    });
  }

  saveAccount(): void {
    this.savingAccount = true;
    const { first_name, last_name, email, phone_number } = this.account;
    this.settings.updateAccount({ first_name: first_name || '', last_name: last_name || '', email: email || '', phone_number: phone_number || '' }).subscribe({
      next: (r) => {
        this.savingAccount = false;
        this.account = { ...r.data };
        const name = [r.data.first_name, r.data.last_name].filter(Boolean).join(' ') || r.data.username;
        this.auth.patchCurrentUser({ name });
        this.ok('บันทึกข้อมูลส่วนตัวแล้ว');
      },
      error: (e) => {
        this.savingAccount = false;
        this.err(e);
      },
    });
  }

  get pwProblem(): string | null {
    if (!this.pw.current || !this.pw.next) return null;
    if (this.pw.next.length < 6) return 'รหัสผ่านใหม่ต้องยาวอย่างน้อย 6 ตัวอักษร';
    if (this.pw.confirm && this.pw.next !== this.pw.confirm) return 'ยืนยันรหัสผ่านไม่ตรงกัน';
    return null;
  }

  changePassword(): void {
    if (!this.pw.current || !this.pw.next || this.pw.next !== this.pw.confirm || this.pwProblem) {
      this.messages.add({ severity: 'warn', summary: 'กรอกไม่ครบ', detail: this.pwProblem || 'กรอกรหัสผ่านเดิม รหัสใหม่ และยืนยันให้ตรงกัน' });
      return;
    }
    this.savingPw = true;
    this.settings.changePassword(this.pw.current, this.pw.next).subscribe({
      next: (r) => {
        this.savingPw = false;
        this.pw = { current: '', next: '', confirm: '' };
        this.ok(r.message);
      },
      error: (e) => {
        this.savingPw = false;
        this.err(e);
      },
    });
  }

  // ===== อุปกรณ์ =====

  loadSessions(): void {
    this.settings.sessions().subscribe({ next: (r) => (this.sessions = r.data), error: (e) => this.err(e) });
  }

  revoke(s: Session): void {
    this.settings.revokeSession(s.id).subscribe({
      next: (r) => {
        this.ok(r.message);
        this.loadSessions();
      },
      error: (e) => this.err(e),
    });
  }

  deviceLabel(s: Session): string {
    const ua = s.deviceInfo?.ua;
    const browser = ua?.browser?.name || 'เบราว์เซอร์';
    const os = [ua?.os?.name, ua?.os?.version].filter(Boolean).join(' ');
    return os ? `${browser} · ${os}` : browser;
  }

  deviceIcon(s: Session): string {
    const type = s.deviceInfo?.ua?.device?.type;
    return type === 'mobile' ? 'pi pi-mobile' : type === 'tablet' ? 'pi pi-tablet' : 'pi pi-desktop';
  }

  // ===== ผู้ใช้ =====

  loadUsers(): void {
    this.settings.listUsers().subscribe({ next: (r) => (this.users = r.data), error: (e) => this.err(e) });
  }

  openUser(u: StaffUser | null): void {
    this.editingUser = u;
    this.userForm = {
      username: u?.username || '',
      password: '',
      role: u?.role || 'user',
      first_name: u?.first_name || '',
      last_name: u?.last_name || '',
      email: u?.email || '',
      phone_number: u?.phone_number || '',
    };
    this.showUserDialog = true;
  }

  saveUser(): void {
    const f = this.userForm;
    this.savingUser = true;
    const profile = { first_name: f.first_name, last_name: f.last_name, email: f.email || undefined, phone_number: f.phone_number, role: f.role };
    const req$ = this.editingUser
      ? this.settings.updateUser(this.editingUser.id, profile)
      : this.settings.createUser({ ...profile, username: f.username.trim(), password: f.password });
    req$.subscribe({
      next: (r) => {
        this.savingUser = false;
        this.showUserDialog = false;
        this.ok(r.message || 'บันทึกแล้ว');
        this.loadUsers();
      },
      error: (e) => {
        this.savingUser = false;
        this.err(e);
      },
    });
  }

  toggleActive(u: StaffUser): void {
    this.settings.updateUser(u.id, { isActive: !u.isActive }).subscribe({
      next: (r) => {
        Object.assign(u, r.data);
        this.ok(u.isActive ? `เปิดใช้งาน ${u.username} แล้ว` : `ปิดใช้งาน ${u.username} แล้ว — ออกจากระบบทุกอุปกรณ์`);
      },
      error: (e) => this.err(e),
    });
  }

  doReset(): void {
    if (!this.resetTarget || this.resetPw.length < 6) {
      this.messages.add({ severity: 'warn', summary: 'รหัสสั้นไป', detail: 'อย่างน้อย 6 ตัวอักษร' });
      return;
    }
    this.settings.resetPassword(this.resetTarget.id, this.resetPw).subscribe({
      next: (r) => {
        this.ok(r.message);
        this.resetTarget = null;
        this.resetPw = '';
      },
      error: (e) => this.err(e),
    });
  }

  displayName(u: Partial<StaffUser>): string {
    return [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || '';
  }

  initials(u: Partial<StaffUser>): string {
    const name = this.displayName(u);
    return name.slice(0, 1).toUpperCase();
  }

  // ===== คลินิก =====

  loadClinic(): void {
    this.settings.getClinic(true).subscribe({
      next: (c) => (this.clinic = { ...c, clinic: { ...c.clinic }, services: c.services.map((s) => ({ ...s })) }),
      error: (e) => this.err(e),
    });
  }

  addService(): void {
    this.clinic?.services.push({ name: '', price: null, active: true });
  }

  removeService(i: number): void {
    this.clinic?.services.splice(i, 1);
  }

  moveService(i: number, dir: -1 | 1): void {
    const list = this.clinic?.services;
    if (!list || i + dir < 0 || i + dir >= list.length) return;
    [list[i], list[i + dir]] = [list[i + dir], list[i]];
  }

  saveClinic(): void {
    if (!this.clinic) return;
    if (!this.clinic.clinic.name?.trim()) {
      this.messages.add({ severity: 'warn', summary: 'กรอกไม่ครบ', detail: 'ใส่ชื่อคลินิก' });
      return;
    }
    const services = this.clinic.services.filter((s) => s.name.trim());
    this.savingClinic = true;
    this.settings.saveClinic({ ...this.clinic, services }).subscribe({
      next: (r) => {
        this.savingClinic = false;
        this.clinic = r.data;
        this.ok(r.message || 'บันทึกแล้ว');
      },
      error: (e) => {
        this.savingClinic = false;
        this.err(e);
      },
    });
  }

  // ===== utils =====

  formatDate(d?: string | null): string {
    if (!d) return '—';
    return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(d));
  }

  private ok(detail: string): void {
    this.messages.add({ severity: 'success', summary: 'สำเร็จ', detail });
  }

  private err(e: any): void {
    const msg = e?.error?.message;
    this.messages.add({ severity: 'error', summary: 'ผิดพลาด', detail: Array.isArray(msg) ? msg.join(', ') : msg || e.message, life: 6000 });
  }
}
