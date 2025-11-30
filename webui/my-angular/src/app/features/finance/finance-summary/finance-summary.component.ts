import { Component, OnInit, PLATFORM_ID, ChangeDetectorRef, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ChartModule } from 'primeng/chart';
import { SelectModule } from 'primeng/select';
import { MessageModule } from 'primeng/message';
import { DialogModule } from 'primeng/dialog';

// Angular Material
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-finance-summary',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    ProgressSpinnerModule,
    ChartModule,
    SelectModule,
    MessageModule,
    DialogModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './finance-summary.component.html',
  styleUrls: ['./finance-summary.component.scss'],
})
export class FinanceSummaryComponent implements OnInit {
  data: any;
  options: any;

  platformId = inject(PLATFORM_ID);
  private cd = inject(ChangeDetectorRef);

  // Mock data for 12 months
  private mockIncomeData = [45000, 38000, 42000, 47000, 50000, 52000, 48000, 49000, 51000, 53000, 55000, 60000];
  private mockExpenseData = [15000, 12000, 14000, 13000, 16000, 15000, 17000, 16500, 15500, 14000, 13500, 14500];

  // ✅ effect created in injection context (field initializer)
  themeEffect = effect(() => {
    this.initChart();
    this.cd.detectChanges();
  });

  ngOnInit(): void {
    this.initChart();
  }

  initChart() {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color') || '#495057';
    const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary') || '#6c757d';
    const surfaceBorder = documentStyle.getPropertyValue('--surface-border') || '#dfe7ef';

    this.data = {
      labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      datasets: [
        {
          label: 'Income',
          backgroundColor: documentStyle.getPropertyValue('--p-green-500') || '#4caf50',
          borderColor: documentStyle.getPropertyValue('--p-green-500') || '#4caf50',
          data: this.mockIncomeData,
        },
        {
          label: 'Expense',
          backgroundColor: documentStyle.getPropertyValue('--p-red-500') || '#f44336',
          borderColor: documentStyle.getPropertyValue('--p-red-500') || '#f44336',
          data: this.mockExpenseData,
        },
      ],
    };

    this.options = {
      maintainAspectRatio: false,
      aspectRatio: 0.8,
      responsive: true,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: textColor,
            usePointStyle: true,
            padding: 15,
          },
        },
        tooltip: {
          enabled: true,
          callbacks: {
            label: (context: any) => {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              return `${label}: ฿${value.toLocaleString('th-TH')}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: textColorSecondary,
            font: {
              weight: 500,
            },
          },
          grid: {
            color: surfaceBorder,
            drawBorder: false,
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: textColorSecondary,
            callback: (value: any) => {
              return '฿' + value.toLocaleString('th-TH');
            },
          },
          grid: {
            color: surfaceBorder,
            drawBorder: false,
          },
        },
      },
    };
  }
}
