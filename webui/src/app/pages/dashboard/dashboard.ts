import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';

// PrimeNG imports
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { ChartModule } from 'primeng/chart';

// Custom components
import { SimplePersonCardComponent } from '../../ui/simple-person-card/simple-person-card';

export interface Patient {
  id: number;
  name: string;
  age: number;
  gender: string;
  appointmentDate: string;
  status: string;
  department: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    TableModule,
    ButtonModule,
    TagModule,
    ProgressBarModule,
    ChartModule,
    SimplePersonCardComponent
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  stats = {
    activePatients: 23,
    doctorsOnDuty: 8,
    nursesOnDuty: 15,
    waitingQueue: 7,
    // finance placeholders
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalTransactions: 0
  };

  // charts - always initialized to avoid "possibly undefined"
  patientGenderChart: any = { labels: [], datasets: [] };
  patientGenderChartOptions: any = { responsive: true, animation: false, maintainAspectRatio: false };

  monthlyPatientsChart: any = { labels: [], datasets: [] };
  monthlyPatientsChartOptions: any = { responsive: true, animation: false, maintainAspectRatio: false };

  chartData: any = { labels: [], datasets: [] };
  chartOptions: any = { responsive: true, animation: false };

  // orders must include `total` used in template
  orders: Array<{ id: string; customer: string; status: string; total: number }> = [
    { id: 'ORD001', customer: 'John Doe', status: 'delivered', total: 129.5 },
    { id: 'ORD002', customer: 'Jane Smith', status: 'pending', total: 49.0 },
    { id: 'ORD003', customer: 'Michael Lee', status: 'cancelled', total: 0 },
    { id: 'ORD004', customer: 'Sara Connor', status: 'delivered', total: 220.75 },
    { id: 'ORD005', customer: 'Tom Hardy', status: 'pending', total: 15.99 }
  ];

  patients: Patient[] = []; // optional, keep if used elsewhere

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.initCharts();
    // example finance calc if financeRecords exist
    // this.calculateFinanceStats();
    this.cdr.markForCheck();
  }

  initCharts(): void {
    this.patientGenderChart = {
      labels: ['ชาย', 'หญิง'],
      datasets: [{ data: [60, 40], backgroundColor: ['#3B82F6', '#EC4899'] }]
    };
    this.patientGenderChartOptions = {
      responsive: true,
      animation: false,
      plugins: { legend: { position: 'bottom' } },
      maintainAspectRatio: false
    };

    this.monthlyPatientsChart = {
      labels: ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม'],
      datasets: [{ label: 'ผู้ป่วยรายเดือน', data: [30, 45, 28, 50, 42], backgroundColor: '#10B981' }]
    };
    this.monthlyPatientsChartOptions = {
      responsive: true,
      animation: false,
      plugins: { legend: { display: false } },
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } }
    };

    this.chartData = {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [
        {
          label: 'Revenue',
          data: [1200, 1900, 1700, 2200, 2800, 3500],
          fill: true,
          borderColor: '#42A5F5',
          tension: 0.4,
          backgroundColor: 'rgba(66,165,245,0.15)'
        }
      ]
    };
    this.chartOptions = { responsive: true, animation: false, plugins: { legend: { display: false } } };
  }

  // trackBy for table / ngFor
  trackByOrder(index: number, item: any) {
    return item?.id ?? index;
  }

  // helper to avoid template errors when checking lengths
  get useVirtualScroll(): boolean {
    return (this.orders?.length ?? 0) > 50;
  }
}
