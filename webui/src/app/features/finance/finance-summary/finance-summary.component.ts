import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ChartModule } from 'primeng/chart';

import { FinanceService } from '../../../core/services/finance.service';
import { FinanceSummary, TrendPoint } from '../../../core/models/finance.model';
import { documentTypeInfo } from '../../../core/models/document.model';

// สีชุดข้อมูล: categorical slot 1–2 ของ dataviz reference palette (ผ่าน validator: CVD ΔE 24.7, contrast ≥ 3:1)
// ไม่ใช้เขียว/แดง เพราะเป็นสีสถานะ — ตัวเลขทุกตัวใช้สีตัวอักษรปกติ สีอยู่ที่แท่งกราฟเท่านั้น
const SERIES = { income: '#2a78d6', expense: '#eb6834' };
const INK = { primary: '#1e293b', secondary: '#64748b', muted: '#8a96a8', grid: '#eef2f6' };
const MAX_CUSTOM_MONTHS = 36;
// ช่วงไม่เกินนี้แสดงกราฟรายวัน ยาวกว่านี้รายเดือน
const DAILY_MAX_DAYS = 62;

type Preset = 'this_month' | 'm3' | 'm6' | 'm12' | 'this_year' | 'last_year' | 'custom';

interface Range {
  start: Date;
  end: Date;
  // เลื่อนกี่เดือนเพื่อหาช่วงก่อนหน้าที่ยาวเท่ากัน
  shiftMonths: number;
}

interface BreakdownRow {
  label: string;
  sub: string;
  total: number;
  share: number;
}

@Component({
  selector: 'app-finance-summary',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ChartModule],
  templateUrl: './finance-summary.component.html',
  styleUrls: ['../../../ui/styles/list-page.scss', './finance-summary.component.scss'],
})
export class FinanceSummaryComponent implements OnInit {
  readonly presets: { value: Preset; label: string }[] = [
    { value: 'this_month', label: 'เดือนนี้' },
    { value: 'm3', label: '3 เดือน' },
    { value: 'm6', label: '6 เดือน' },
    { value: 'm12', label: '12 เดือน' },
    { value: 'this_year', label: 'ปีนี้' },
    { value: 'last_year', label: 'ปีที่แล้ว' },
    { value: 'custom', label: 'กำหนดเอง' },
  ];
  readonly series = SERIES;

  preset: Preset = 'm6';
  // ช่วงกำหนดเอง (input type="month" → YYYY-MM)
  customStart = '';
  customEnd = '';
  customError = '';

  range!: Range;
  previous!: Range;
  granularity: 'day' | 'month' = 'month';
  loading = false;

  trend: TrendPoint[] = [];
  summary: FinanceSummary | null = null;
  prevSummary: FinanceSummary | null = null;

  chartData: any;
  chartOptions: any;
  incomeRows: BreakdownRow[] = [];
  expenseRows: BreakdownRow[] = [];

  constructor(private financeService: FinanceService) {}

  ngOnInit(): void {
    const now = new Date();
    this.customEnd = this.ym(now);
    this.customStart = this.ym(new Date(now.getFullYear() - 1, now.getMonth() + 1, 1));
    this.selectPreset('m6');
  }

  // ----- ช่วงเวลา -----

  selectPreset(preset: Preset): void {
    this.preset = preset;
    if (preset === 'custom') {
      this.applyCustom();
      return;
    }
    this.customError = '';
    this.setRange(this.presetRange(preset));
  }

  applyCustom(): void {
    this.preset = 'custom';
    if (!this.customStart || !this.customEnd) return;
    const [sy, sm] = this.customStart.split('-').map(Number);
    const [ey, em] = this.customEnd.split('-').map(Number);
    const months = (ey - sy) * 12 + (em - sm) + 1;
    if (months < 1) {
      this.customError = 'เดือนเริ่มต้องไม่เกินเดือนสิ้นสุด';
      return;
    }
    if (months > MAX_CUSTOM_MONTHS) {
      this.customError = `เลือกได้ไม่เกิน ${MAX_CUSTOM_MONTHS} เดือน`;
      return;
    }
    this.customError = '';
    this.setRange({ start: new Date(sy, sm - 1, 1), end: this.clampToday(new Date(ey, em, 0)), shiftMonths: months });
  }

  private presetRange(preset: Preset): Range {
    const today = this.today();
    const y = today.getFullYear();
    const m = today.getMonth();
    const lastMonths = (n: number): Range => ({ start: new Date(y, m - (n - 1), 1), end: today, shiftMonths: n });
    switch (preset) {
      case 'this_month':
        return lastMonths(1);
      case 'm3':
        return lastMonths(3);
      case 'm12':
        return lastMonths(12);
      case 'this_year':
        return { start: new Date(y, 0, 1), end: today, shiftMonths: 12 };
      case 'last_year':
        return { start: new Date(y - 1, 0, 1), end: new Date(y - 1, 11, 31), shiftMonths: 12 };
      default:
        return lastMonths(6);
    }
  }

  // ช่วงก่อนหน้าที่ยาวเท่ากัน เช่น 1–16 ต.ค. → 1–16 ก.ย. (ไม่เทียบเดือนที่ยังไม่จบกับเดือนเต็ม)
  private setRange(range: Range): void {
    this.range = range;
    this.previous = {
      start: this.addMonths(range.start, -range.shiftMonths),
      end: this.addMonths(range.end, -range.shiftMonths),
      shiftMonths: range.shiftMonths,
    };
    const days = (range.end.getTime() - range.start.getTime()) / 86400000;
    this.granularity = days <= DAILY_MAX_DAYS ? 'day' : 'month';
    this.load();
  }

  private load(): void {
    this.loading = true;
    const [start, end] = [this.ymd(this.range.start), this.ymd(this.range.end)];
    forkJoin({
      trend: this.financeService.getTrend(start, end, this.granularity),
      summary: this.financeService.getSummary(start, end),
      prev: this.financeService.getSummary(this.ymd(this.previous.start), this.ymd(this.previous.end)),
    }).subscribe({
      next: ({ trend, summary, prev }) => {
        this.trend = trend.data;
        this.summary = summary.data;
        this.prevSummary = prev.data;
        this.buildChart();
        this.buildBreakdown();
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  // ----- กราฟ -----

  private buildChart(): void {
    const bar = (label: string, color: string, data: number[]) => ({
      label,
      data,
      backgroundColor: color,
      hoverBackgroundColor: color,
      // แท่งบาง โค้ง 4px ที่ปลาย เหลี่ยมที่ฐาน, เว้นช่องระหว่างแท่ง
      maxBarThickness: 24,
      borderRadius: { topLeft: 4, topRight: 4 },
      borderSkipped: 'bottom',
      borderWidth: { left: 1, right: 1 },
      borderColor: '#ffffff',
    });

    this.chartData = {
      labels: this.trend.map((p) => this.bucketLabel(p.bucket)),
      datasets: [
        bar('รายรับ', SERIES.income, this.trend.map((p) => p.income)),
        bar('รายจ่าย', SERIES.expense, this.trend.map((p) => p.expense)),
      ],
    };

    const baht = (v: number) => '฿' + Number(v).toLocaleString('th-TH', { maximumFractionDigits: 0 });
    this.chartOptions = {
      maintainAspectRatio: false,
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: { color: INK.secondary, usePointStyle: true, pointStyle: 'rectRounded', boxWidth: 10, boxHeight: 10, padding: 16 },
        },
        tooltip: {
          backgroundColor: '#ffffff',
          titleColor: INK.primary,
          bodyColor: INK.secondary,
          footerColor: INK.primary,
          borderColor: '#e2e8f0',
          borderWidth: 1,
          padding: 10,
          boxPadding: 4,
          usePointStyle: true,
          callbacks: {
            title: (items: any[]) => this.bucketLabel(this.trend[items[0]?.dataIndex]?.bucket ?? '', true),
            label: (ctx: any) => ` ${ctx.dataset.label}  ${baht(ctx.parsed.y)}`,
            footer: (items: any[]) => {
              const p = this.trend[items[0]?.dataIndex];
              return p ? `สุทธิ ${p.net < 0 ? '−' : ''}${baht(Math.abs(p.net))}` : '';
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: INK.muted, autoSkip: true, maxRotation: 0, maxTicksLimit: this.granularity === 'day' ? 10 : 12 },
          grid: { display: false },
          border: { color: INK.grid },
        },
        y: {
          beginAtZero: true,
          ticks: { color: INK.muted, maxTicksLimit: 5, callback: (v: number) => baht(v) },
          grid: { color: INK.grid },
          border: { display: false },
        },
      },
    };
  }

  // ----- แยกที่มา -----

  private buildBreakdown(): void {
    const s = this.summary;
    if (!s) return;
    const share = (total: number, of: number) => (of > 0 ? Math.round((total / of) * 100) : 0);

    this.incomeRows = (s.income_breakdown || []).map((r) => ({
      label: r.label,
      sub: r.kind === 'manual' ? `บันทึกเอง ${r.count} รายการ` : `${r.count} ครั้ง`,
      total: r.total,
      share: share(r.total, s.income.total),
    }));

    const fromDocs = (s.by_source || [])
      .filter((r) => r.category === 'expense' && r.source !== 'manual')
      .map((r) => ({
        label: r.source === 'receive' ? 'ซื้อยา/เวชภัณฑ์ (รับของเข้า)' : documentTypeInfo(r.source).label,
        sub: `${r.count} เอกสาร`,
        total: r.total,
        share: share(r.total, s.expense.total),
      }));
    const manual = (s.top_manual_expenses || []).map((r) => ({
      label: r.item_name,
      sub: `${r.count} รายการ`,
      total: r.total,
      share: share(r.total, s.expense.total),
    }));
    this.expenseRows = [...fromDocs, ...manual].sort((a, b) => b.total - a.total);
  }

  // ----- เทียบช่วงก่อน -----

  // คืน null ถ้าช่วงก่อนเป็น 0 (คิด % ไม่ได้)
  change(current: unknown, previous: unknown): number | null {
    const c = this.num(current);
    const p = this.num(previous);
    if (p === 0) return null;
    return Math.round(((c - p) / Math.abs(p)) * 100);
  }

  avgPerVisit(): number {
    const visits = this.summary?.service_stats?.visits ?? 0;
    const serviceIncome = (this.summary?.income_breakdown || [])
      .filter((r) => r.kind !== 'manual')
      .reduce((sum, r) => sum + r.total, 0);
    return visits ? serviceIncome / visits : 0;
  }

  // ----- แสดงผล -----

  rangeLabel(r: Range | undefined = this.range): string {
    if (!r) return '';
    const sameYear = r.start.getFullYear() === r.end.getFullYear();
    const fmt = (d: Date, withYear: boolean) =>
      new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', ...(withYear ? { year: '2-digit' } : {}) }).format(d);
    return `${fmt(r.start, !sameYear)} – ${fmt(r.end, true)}`;
  }

  bucketLabel(bucket: string, long = false): string {
    if (!bucket) return '';
    const parts = bucket.split('-').map(Number);
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return new Intl.DateTimeFormat('th-TH', long ? { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' } : { day: 'numeric', month: 'short' }).format(d);
    }
    const d = new Date(parts[0], parts[1] - 1, 1);
    return new Intl.DateTimeFormat('th-TH', { month: long ? 'long' : 'short', year: '2-digit' }).format(d);
  }

  num(value: unknown): number {
    return Number(value) || 0;
  }

  abs(n: number): number {
    return Math.abs(n);
  }

  formatMoney(value: unknown): string {
    return '฿' + this.num(value).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  // ----- วันที่ -----

  private today(): Date {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  private clampToday(d: Date): Date {
    const t = this.today();
    return d > t ? t : d;
  }

  // เลื่อนเดือน โดยวันที่เกินสิ้นเดือนให้ชิดสิ้นเดือน (31 มี.ค. − 1 เดือน = 28/29 ก.พ.)
  private addMonths(d: Date, months: number): Date {
    const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    return new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), lastDay));
  }

  private ymd(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private ym(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
}
