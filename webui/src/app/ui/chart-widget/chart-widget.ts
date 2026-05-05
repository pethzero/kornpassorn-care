import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';

export interface ChartData {
  labels: string[];
  datasets: any[];
}

@Component({
  selector: 'app-chart-widget',
  standalone: true,
  imports: [CommonModule, CardModule, ChartModule],
  template: `
    <p-card class="chart-widget h-full">
      <ng-template pTemplate="header">
        <div class="flex justify-content-between align-items-center p-3">
          <div>
            <h3 class="m-0 text-900">{{ title }}</h3>
            <p class="text-600 mt-1 mb-0">{{ subtitle }}</p>
          </div>
          @if (showFilter) {
            <div class="chart-controls">
              <select 
                [value]="selectedFilter"
                (change)="onFilterChange($event)"
                class="p-inputtext p-component p-dropdown">
                @for (option of filterOptions; track option.value) {
                  <option [value]="option.value">{{ option.label }}</option>
                }
              </select>
            </div>
          }
        </div>
      </ng-template>
      
      <p-chart 
        [type]="chartType" 
        [data]="data" 
        [options]="options"
        [class]="chartClass">
      </p-chart>

      @if (showSummary) {
        <div class="chart-summary mt-3 p-3 bg-gray-50 border-round">
          <div class="grid">
            @for (item of summaryItems; track item.label) {
              <div class="col-6 md:col-3">
                <div class="text-center">
                  <div class="text-2xl font-bold text-primary">{{ item.value }}</div>
                  <div class="text-sm text-600">{{ item.label }}</div>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </p-card>
  `,
  styleUrl: './chart-widget.scss'
})
export class ChartWidgetComponent {
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() chartType: 'bar' | 'line' | 'pie' | 'doughnut' | 'radar' = 'bar';
  @Input() data: ChartData = { labels: [], datasets: [] };
  @Input() options: any = {};
  @Input() chartClass: string = 'dashboard-chart';
  
  @Input() showFilter: boolean = false;
  @Input() filterOptions: any[] = [];
  @Input() filterOptionLabel: string = 'label';
  @Input() filterOptionValue: string = 'value';
  @Input() selectedFilter: any;
  
  @Input() showSummary: boolean = false;
  @Input() summaryItems: { label: string; value: string | number; }[] = [];

  onFilterChange(event?: any) {
    if (event) {
      this.selectedFilter = event.target.value;
    }
    // Emit filter change event or handle locally
    console.log('Filter changed:', this.selectedFilter);
  }
}
