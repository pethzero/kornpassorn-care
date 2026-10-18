import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ChartModule } from 'primeng/chart';

import { DocumentService } from '../../core/services/document.service';
import { FinanceService } from '../../core/services/finance.service';
import { InventoryService } from '../../core/services/inventory.service';
import { ClinicDocument, documentTypeInfo } from '../../core/models/document.model';
import { FinanceSummary, TrendPoint } from '../../core/models/finance.model';
import { InventoryProduct, InventoryProductLot } from '../../core/models/inventory.model';

// สีรายรับ = categorical slot 1 (เดียวกับหน้าสรุปการเงิน — ผ่าน validator แล้ว)
const INCOME = '#2a78d6';
const INK = { primary: '#1e293b', secondary: '#64748b', muted: '#8a96a8', grid: '#eef2f6' };
const EXPIRY_WARN_DAYS = 30;

interface AlertItem {
  kind: 'out' | 'low' | 'expired' | 'expiring';
  title: string;
  detail: string;
  route: string;
  query?: Record<string, unknown>;
}

// แดชบอร์ดเจ้าหน้าที่ — ข้อมูลจริงทั้งหมดจาก API เดิม (เอกสาร / บัญชีการเงิน / คลังสินค้า)
// เดิมเป็นตัวเลขสมมติ (คนไข้ 23, แพทย์เวร 8 ...) ที่ไม่ได้มาจากระบบ
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ChartModule],
  templateUrl: './dashboard.html',
  styleUrls: ['../../ui/styles/list-page.scss', './dashboard.scss'],
})
export class DashboardComponent implements OnInit {
  loading = true;
  readonly today = new Date();
  readonly typeInfo = documentTypeInfo;

  // วันนี้
  visitsToday = 0;
  incomeToday = 0;
  // เดือนนี้
  month: FinanceSummary | null = null;
  // คลัง
  outOfStock: InventoryProduct[] = [];
  lowStock: InventoryProduct[] = [];
  expiredLots: InventoryProductLot[] = [];
  expiringLots: InventoryProductLot[] = [];
  alerts: AlertItem[] = [];

  recentDocs: ClinicDocument[] = [];
  trend: TrendPoint[] = [];
  chartData: any;
  chartOptions: any;

  // เมนูหน้าต่างๆ ด้านบน (สร้างเอกสารอยู่ในปุ่มของแถบหัวแล้ว) — tone = สีอ่อนของไอคอน
  readonly shortcuts: { label: string; desc: string; icon: string; route: string; tone: string; query?: Record<string, string> }[] = [
    { label: 'เอกสาร', desc: 'รับเข้า บริการ เบิก ปรับยอด', icon: 'pi pi-file', route: '/documents', tone: 'teal' },
    { label: 'รายรับ-รายจ่าย', desc: 'บัญชีการเงิน', icon: 'pi pi-wallet', route: '/finance/list', tone: 'amber' },
    { label: 'สรุปยอด', desc: 'กราฟ & เทียบช่วงก่อน', icon: 'pi pi-chart-bar', route: '/finance/summary', tone: 'blue' },
    { label: 'สินค้า', desc: 'ยา เวชภัณฑ์ ยี่ห้อ', icon: 'pi pi-tags', route: '/inventory/products', tone: 'violet' },
    { label: 'ล็อต / สต็อก', desc: 'คงเหลือ วันหมดอายุ', icon: 'pi pi-box', route: '/inventory/lots', tone: 'orange' },
    { label: 'ผู้ป่วย', desc: 'รายชื่อ & ประวัติ', icon: 'pi pi-users', route: '/patient/list', tone: 'sky' },
    { label: 'แบบสอบถาม', desc: 'คำตอบจากผู้ป่วย', icon: 'pi pi-list-check', route: '/questionnaire/list', tone: 'rose' },
    { label: 'เวลาทำการ', desc: 'วันเปิด-ปิดคลินิก', icon: 'pi pi-calendar', route: '/hospital-schedule', tone: 'slate' },
  ];

  // ประโยคสรุปวันนี้ในแถบหัว
  get todaySummary(): string {
    const parts = [this.visitsToday ? `วันนี้บริการคนไข้แล้ว ${this.visitsToday} ครั้ง` : 'วันนี้ยังไม่มีบริการคนไข้'];
    parts.push(this.alerts.length ? `มี ${this.alerts.length} เรื่องในคลังที่ต้องจัดการ` : 'คลังสินค้าเรียบร้อยดี');
    return parts.join(' · ');
  }

  constructor(
    private documentService: DocumentService,
    private financeService: FinanceService,
    private inventoryService: InventoryService,
  ) {}

  ngOnInit(): void {
    const today = this.ymd(this.today);
    const monthStart = this.ymd(new Date(this.today.getFullYear(), this.today.getMonth(), 1));
    const trendStart = this.ymd(new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate() - 13));
    const expiringBefore = this.ymd(new Date(this.today.getTime() + EXPIRY_WARN_DAYS * 86400000));
    // ส่วนใดโหลดไม่ได้ (เช่น สิทธิ์ไม่พอ) ให้หน้าที่เหลือยังแสดงได้
    const safe = <T>(obs: any, fallback: T) => obs.pipe(catchError(() => of(fallback)));

    forkJoin({
      todayVisits: safe(
        this.documentService.getDocuments({ doc_type: 'patient_service', status: 'confirmed', start_date: today, end_date: today, limit: 100 }),
        { data: [] as ClinicDocument[] },
      ),
      recent: safe(this.documentService.getDocuments({ limit: 6 }), { data: [] as ClinicDocument[] }),
      month: safe(this.financeService.getSummary(monthStart, today), { data: null }),
      trend: safe(this.financeService.getTrend(trendStart, today, 'day'), { data: [] as TrendPoint[] }),
      products: safe(this.inventoryService.getProducts({ is_active: true, limit: 200 }), { data: [] as InventoryProduct[] }),
      lots: safe(this.inventoryService.getLots({ expiring_before: expiringBefore, limit: 200 }), { data: [] as InventoryProductLot[] }),
    }).subscribe((res: any) => {
      const visits: ClinicDocument[] = res.todayVisits.data;
      this.visitsToday = visits.length;
      this.incomeToday = visits.reduce((sum, d) => sum + Number(d.total_amount || 0), 0);
      this.recentDocs = res.recent.data;
      this.month = res.month.data;
      this.trend = res.trend.data;

      const products: InventoryProduct[] = res.products.data;
      const stock = (p: InventoryProduct) => Number(p.stock_remaining ?? 0);
      this.outOfStock = products.filter((p) => stock(p) <= 0);
      this.lowStock = products.filter(
        (p) => stock(p) > 0 && p.reorder_level != null && stock(p) <= Number(p.reorder_level),
      );

      const lots: InventoryProductLot[] = res.lots.data.filter((l: InventoryProductLot) => Number(l.quantity_remaining) > 0);
      this.expiredLots = lots.filter((l) => this.daysLeft(l) < 0);
      this.expiringLots = lots.filter((l) => this.daysLeft(l) >= 0);

      this.buildAlerts();
      this.buildChart();
      this.loading = false;
    });
  }

  // รายการที่ต้องจัดการ เรียงตามความเร่งด่วน: หมดอายุแล้ว → ของหมด → ใกล้หมดอายุ → ใกล้หมด
  private buildAlerts(): void {
    const lotAlert = (l: InventoryProductLot, kind: 'expired' | 'expiring'): AlertItem => ({
      kind,
      title: l.product?.name || `ล็อต ${l.lot_no}`,
      detail:
        kind === 'expired'
          ? `ล็อต ${l.lot_no} หมดอายุแล้ว · เหลือ ${Number(l.quantity_remaining)} ${l.product?.unit || ''}`
          : `ล็อต ${l.lot_no} หมดอายุอีก ${this.daysLeft(l)} วัน · เหลือ ${Number(l.quantity_remaining)} ${l.product?.unit || ''}`,
      route: '/inventory/lots',
      query: { product_id: l.product_id },
    });
    const productAlert = (p: InventoryProduct, kind: 'out' | 'low'): AlertItem => ({
      kind,
      title: p.name,
      detail:
        kind === 'out'
          ? 'ของหมดแล้ว'
          : `เหลือ ${Number(p.stock_remaining ?? 0)} ${p.unit || ''} (แจ้งเตือนที่ ${Number(p.reorder_level)})`,
      route: '/inventory/lots',
      query: { product_id: p.id },
    });
    this.alerts = [
      ...this.expiredLots.map((l) => lotAlert(l, 'expired')),
      ...this.outOfStock.map((p) => productAlert(p, 'out')),
      ...this.expiringLots.map((l) => lotAlert(l, 'expiring')),
      ...this.lowStock.map((p) => productAlert(p, 'low')),
    ];
  }

  private buildChart(): void {
    const baht = (v: number) => '฿' + Number(v).toLocaleString('th-TH', { maximumFractionDigits: 0 });
    this.chartData = {
      labels: this.trend.map((p) => this.dayLabel(p.bucket)),
      datasets: [
        {
          label: 'รายรับ',
          data: this.trend.map((p) => p.income),
          backgroundColor: INCOME,
          hoverBackgroundColor: INCOME,
          maxBarThickness: 18,
          borderRadius: { topLeft: 4, topRight: 4 },
          borderSkipped: 'bottom',
        },
      ],
    };
    this.chartOptions = {
      maintainAspectRatio: false,
      responsive: true,
      plugins: {
        // ชุดข้อมูลเดียว — หัวการ์ดบอกชื่อแล้ว ไม่ต้องมี legend
        legend: { display: false },
        tooltip: {
          backgroundColor: '#ffffff',
          titleColor: INK.primary,
          bodyColor: INK.secondary,
          borderColor: '#e2e8f0',
          borderWidth: 1,
          padding: 10,
          displayColors: false,
          callbacks: {
            title: (items: any[]) => this.dayLabel(this.trend[items[0]?.dataIndex]?.bucket ?? '', true),
            label: (ctx: any) => `รายรับ ${baht(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        x: { ticks: { color: INK.muted, maxRotation: 0, autoSkip: true, maxTicksLimit: 7 }, grid: { display: false }, border: { color: INK.grid } },
        y: { beginAtZero: true, ticks: { color: INK.muted, maxTicksLimit: 4, callback: (v: number) => baht(v) }, grid: { color: INK.grid }, border: { display: false } },
      },
    };
  }

  // ----- แสดงผล -----

  get greeting(): string {
    const h = this.today.getHours();
    return h < 12 ? 'สวัสดีตอนเช้า' : h < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น';
  }

  get todayLabel(): string {
    return new Intl.DateTimeFormat('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(this.today);
  }

  get trendTotal(): number {
    return this.trend.reduce((sum, p) => sum + p.income, 0);
  }

  partyLine(doc: ClinicDocument): string {
    if (doc.doc_type === 'patient_service' && doc.patient) return `${doc.patient.first_name} ${doc.patient.last_name}`.trim();
    if (doc.doc_type === 'receive') return doc.supplier || 'ไม่ระบุผู้ขาย';
    return doc.reason || '-';
  }

  typeChipClass(type: string): string {
    return type === 'receive' ? 'chip-info' : type === 'patient_service' ? 'chip-accent' : type === 'adjust' ? 'chip-warn' : '';
  }

  alertIcon(kind: AlertItem['kind']): string {
    return kind === 'expired' || kind === 'expiring' ? 'pi pi-clock' : 'pi pi-box';
  }

  num(v: unknown): number {
    return Number(v) || 0;
  }

  money(v: unknown): string {
    return '฿' + this.num(v).toLocaleString('th-TH', { maximumFractionDigits: 2 });
  }

  shortDate(date: string): string {
    return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' }).format(new Date(date));
  }

  private dayLabel(bucket: string, long = false): string {
    if (!bucket) return '';
    const [y, m, d] = bucket.split('-').map(Number);
    return new Intl.DateTimeFormat('th-TH', long ? { weekday: 'short', day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short' }).format(new Date(y, m - 1, d));
  }

  private daysLeft(lot: InventoryProductLot): number {
    if (!lot.expiry_date) return Infinity;
    const start = new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate()).getTime();
    return Math.ceil((new Date(lot.expiry_date).getTime() - start) / 86400000);
  }

  private ymd(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
