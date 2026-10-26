import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';

import { AuthService } from '../../core/services/auth.service';
import { ClinicSettings, DeviceSummary, LoginLogRow, Session, SettingsService, StaffUser } from '../../core/services/settings.service';

type Tab = 'account' | 'sessions' | 'online' | 'users' | 'clinic';

const ROLE_LABEL: Record<string, string> = { admin: 'ผู้ดูแลระบบ', user: 'เจ้าหน้าที่', patient: 'คนไข้', guest: 'ผู้เยี่ยมชม' };
const MONITOR_REFRESH_MS = 30_000;

// ตั้งค่า: บัญชีของฉัน / อุปกรณ์ที่ login (ทุกคน) + ผู้ใช้ออนไลน์ / ผู้ใช้งาน / คลินิก & บริการ (admin)
@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ButtonModule, DialogModule, InputTextModule, InputNumberModule, ToastModule, TooltipModule, ConfirmDialogModule],
  templateUrl: './settings.html',
  styleUrls: ['../../ui/styles/list-page.scss', './settings.scss'],
  providers: [MessageService, ConfirmationService],
})
export class SettingsComponent implements OnInit, OnDestroy {
  tab: Tab = 'account';
  isAdmin = false;

  // บัญชีของฉัน
  account: Partial<StaffUser> = {};
  savingAccount = false;
  pw = { current: '', next: '', confirm: '' };
  savingPw = false;

  // อุปกรณ์ของฉัน
  sessions: Session[] = [];
  sessionsLoaded = false;

  // ผู้ใช้ออนไลน์ (admin) — รีเฟรชเองทุก 30 วินาทีขณะเปิดแท็บนี้
  monitor: Session[] = [];
  monitorFilter: 'online' | 'all' = 'online';
  loginLogs: LoginLogRow[] = [];
  monitorUpdatedAt: Date | null = null;
  private monitorTimer: ReturnType<typeof setInterval> | null = null;
  readonly roleLabel = ROLE_LABEL;

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
    private confirm: ConfirmationService,
  ) {}

  get tabs(): { key: Tab; label: string; icon: string }[] {
    return [
      { key: 'account', label: 'บัญชีของฉัน', icon: 'pi pi-user' },
      { key: 'sessions', label: 'อุปกรณ์ที่เข้าสู่ระบบ', icon: 'pi pi-desktop' },
      ...(this.isAdmin
        ? [
            { key: 'online' as Tab, label: 'ผู้ใช้ออนไลน์', icon: 'pi pi-eye' },
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

  ngOnDestroy(): void {
    this.stopMonitor();
  }

  open(tab: Tab): void {
    this.tab = tab;
    this.stopMonitor();
    if (tab === 'online') this.startMonitor();
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

  // ===== อุปกรณ์ของฉัน =====

  loadSessions(): void {
    this.settings.sessions().subscribe({
      next: (r) => {
        this.sessions = r.data;
        this.sessionsLoaded = true;
      },
      error: (e) => this.err(e),
    });
  }

  get otherSessions(): Session[] {
    return this.sessions.filter((s) => !s.current);
  }

  revoke(s: Session): void {
    this.confirm.confirm({
      header: 'ออกจากระบบอุปกรณ์นี้',
      message: `${this.deviceTitle(s.device)} จะต้องเข้าสู่ระบบใหม่ทันทีที่ใช้งานครั้งถัดไป`,
      icon: 'pi pi-sign-out',
      rejectButtonProps: { label: 'ยกเลิก', severity: 'secondary', outlined: true },
      acceptButtonProps: { label: 'ออกจากระบบ', severity: 'danger' },
      accept: () =>
        this.settings.revokeSession(s.id).subscribe({
          next: (r) => {
            this.ok(r.message);
            this.loadSessions();
          },
          error: (e) => this.err(e),
        }),
    });
  }

  revokeOthers(): void {
    this.confirm.confirm({
      header: 'ออกจากระบบอุปกรณ์อื่นทั้งหมด',
      message: `อุปกรณ์อื่น ${this.otherSessions.length} เครื่องจะต้องเข้าสู่ระบบใหม่ — เครื่องนี้ยังใช้ต่อได้ ถ้าไม่รู้จักอุปกรณ์ไหน ควรเปลี่ยนรหัสผ่านด้วย`,
      icon: 'pi pi-shield',
      rejectButtonProps: { label: 'ยกเลิก', severity: 'secondary', outlined: true },
      acceptButtonProps: { label: 'ออกจากระบบทั้งหมด', severity: 'danger' },
      accept: () =>
        this.settings.revokeOtherSessions().subscribe({
          next: (r) => {
            this.ok(r.message);
            this.loadSessions();
          },
          error: (e) => this.err(e),
        }),
    });
  }

  // ===== ผู้ใช้ออนไลน์ (admin) =====

  private startMonitor(): void {
    this.loadMonitor();
    this.monitorTimer = setInterval(() => this.loadMonitor(true), MONITOR_REFRESH_MS);
  }

  private stopMonitor(): void {
    if (this.monitorTimer) clearInterval(this.monitorTimer);
    this.monitorTimer = null;
  }

  loadMonitor(silent = false): void {
    this.settings.allSessions().subscribe({
      next: (r) => {
        this.monitor = r.data;
        this.monitorUpdatedAt = new Date();
      },
      error: (e) => !silent && this.err(e),
    });
    this.settings.loginLogs(30).subscribe({ next: (r) => (this.loginLogs = r.data), error: (e) => !silent && this.err(e) });
  }

  get monitorRows(): Session[] {
    return this.monitorFilter === 'online' ? this.monitor.filter((s) => s.online) : this.monitor;
  }

  get onlineCount(): number {
    return this.monitor.filter((s) => s.online).length;
  }

  countByRole(role: string): number {
    return this.monitor.filter((s) => s.online && s.role === role).length;
  }

  get failedLogins24h(): number {
    const since = Date.now() - 24 * 3600 * 1000;
    return this.loginLogs.filter((l) => !l.success && new Date(l.at).getTime() > since).length;
  }

  kick(s: Session): void {
    this.confirm.confirm({
      header: 'เตะออกจากระบบ',
      message: `${s.name} (${ROLE_LABEL[s.role]}) บน ${this.deviceTitle(s.device)} จะหลุดทันทีที่ใช้งานครั้งถัดไป และต่ออายุไม่ได้ — ถ้าเป็นบัญชีเจ้าหน้าที่ที่ไม่ควรเข้ามา ให้ปิดใช้งาน/ตั้งรหัสใหม่ในแท็บ "ผู้ใช้งาน" ด้วย`,
      icon: 'pi pi-ban',
      rejectButtonProps: { label: 'ยกเลิก', severity: 'secondary', outlined: true },
      acceptButtonProps: { label: 'เตะออก', severity: 'danger' },
      accept: () =>
        this.settings.kickSession(s.id).subscribe({
          next: (r) => {
            this.ok(r.message);
            this.loadMonitor(true);
          },
          error: (e) => this.err(e),
        }),
    });
  }

  // ===== แสดงผลอุปกรณ์ (ใช้ทั้ง 2 แท็บ) =====

  deviceIcon(d: DeviceSummary): string {
    return d.type === 'mobile' ? 'pi pi-mobile' : d.type === 'tablet' ? 'pi pi-tablet' : 'pi pi-desktop';
  }

  // "Samsung SM-S918B · Android 14" / "คอมพิวเตอร์ · Windows 10" — ใช้แยกโน้ตบุ๊กกับโทรศัพท์ (WiFi เดียวกัน IP จะเหมือนกัน)
  deviceTitle(d: DeviceSummary): string {
    const kind = d.type === 'mobile' ? 'โทรศัพท์' : d.type === 'tablet' ? 'แท็บเล็ต' : 'คอมพิวเตอร์';
    return [d.model || kind, d.os].filter(Boolean).join(' · ');
  }

  failReason(reason: string | null): string {
    const map: Record<string, string> = {
      'Invalid credentials': 'รหัสผ่านผิด / ไม่มีผู้ใช้นี้',
      'Locked out': 'ถูกพัก (ผิดหลายครั้ง)',
      'Invalid OTP': 'OTP ผิด',
      'OTP invalid or expired': 'OTP หมดอายุ',
      'Too many OTP attempts': 'OTP ผิดเกินกำหนด',
    };
    return (reason && map[reason]) || reason || 'ไม่สำเร็จ';
  }

  ago(d: string): string {
    const min = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (min < 1) return 'เมื่อสักครู่';
    if (min < 60) return `${min} นาทีที่แล้ว`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h} ชม. ที่แล้ว`;
    return this.formatDate(d);
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
