import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, CardModule],
  template: `
    <p-card class="stat-card h-full">
      <div class="flex align-items-center">
        <div class="stat-icon mr-3" [ngClass]="iconClass">
          <i [class]="icon + ' text-2xl'"></i>
        </div>
        <div>
          <div class="text-500 font-medium mb-1">{{ title }}</div>
          <div class="text-3xl font-bold text-900">{{ value | number }}</div>
          <div *ngIf="trend" class="text-sm" [ngClass]="trendClass">
            <i [class]="trendIcon"></i>
            <span class="font-medium">{{ trend.value }}</span>
            <span class="text-500"> {{ trend.label }}</span>
          </div>
        </div>
      </div>
    </p-card>
  `,
  styleUrls: ['./stat-card.scss']
})
export class StatCardComponent {
  @Input() title: string = '';
  @Input() value: number = 0;
  @Input() icon: string = 'pi pi-chart-line';
  @Input() iconClass: string = 'bg-blue-100 text-blue-600';
  @Input() trend?: {
    value: string;
    label: string;
    type: 'up' | 'down' | 'neutral';
  };

  get trendClass(): string {
    if (!this.trend) return '';
    return this.trend.type === 'up' ? 'text-green-500' : 
           this.trend.type === 'down' ? 'text-red-500' : 'text-blue-500';
  }

  get trendIcon(): string {
    if (!this.trend) return '';
    return this.trend.type === 'up' ? 'pi pi-arrow-up' :
           this.trend.type === 'down' ? 'pi pi-arrow-down' : 'pi pi-minus';
  }
}
