import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-person-card',
  standalone: true,
  imports: [CommonModule, CardModule],
  template: `
    <p-card class="person-card h-full">
      <div class="person-card-content">
        <!-- Avatar/Icon Section -->
        <div class="person-avatar" [ngClass]="avatarClass">
          <i [class]="icon + ' text-4xl'"></i>
        </div>
        
        <!-- Info Section -->
        <div class="person-info">
          <div class="person-title">{{ title }}</div>
          <div class="person-count">{{ value | number }}</div>
          <div class="person-subtitle" *ngIf="subtitle">{{ subtitle }}</div>
        </div>
        
        <!-- Status/Action Section -->
        <div class="person-status" *ngIf="status">
          <div class="status-indicator" [ngClass]="statusClass">
            <i [class]="statusIcon"></i>
            <span>{{ status }}</span>
          </div>
        </div>
      </div>
    </p-card>
  `,
  styleUrls: ['./person-card.scss']
})
export class PersonCardComponent {
  @Input() title: string = '';
  @Input() value: number = 0;
  @Input() subtitle?: string;
  @Input() icon: string = 'pi pi-user';
  @Input() avatarClass: string = 'bg-blue-100 text-blue-600';
  @Input() status?: string;
  @Input() statusType: 'online' | 'busy' | 'away' | 'offline' = 'online';

  get statusClass(): string {
    const baseClass = 'status-';
    switch (this.statusType) {
      case 'online': return baseClass + 'online';
      case 'busy': return baseClass + 'busy';
      case 'away': return baseClass + 'away';
      case 'offline': return baseClass + 'offline';
      default: return baseClass + 'online';
    }
  }

  get statusIcon(): string {
    switch (this.statusType) {
      case 'online': return 'pi pi-circle-fill';
      case 'busy': return 'pi pi-minus-circle';
      case 'away': return 'pi pi-clock';
      case 'offline': return 'pi pi-times-circle';
      default: return 'pi pi-circle-fill';
    }
  }
}
