import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

export interface QuickAction {
  label: string;
  icon: string;
  action: string;
  color?: 'primary' | 'secondary' | 'success' | 'info' | 'warn' | 'danger';
  disabled?: boolean;
}

@Component({
  selector: 'app-quick-actions',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule],
  template: `
    <p-card class="quick-actions-card h-full">
      <ng-template pTemplate="header">
        <div class="p-3">
          <h3 class="m-0 text-900">{{ title }}</h3>
          <p class="text-600 mt-1 mb-0">{{ subtitle }}</p>
        </div>
      </ng-template>
      
      <div class="flex flex-column gap-3">
        <p-button 
          *ngFor="let action of actions"
          [label]="action.label"
          [icon]="action.icon"
          [outlined]="true"
          [disabled]="action.disabled"
          [severity]="action.color || 'primary'"
          size="large"
          class="w-full"
          (onClick)="onActionClick(action.action)">
        </p-button>
      </div>

      <ng-content></ng-content>
    </p-card>
  `,
  styleUrls: ['./quick-actions.scss']
})
export class QuickActionsComponent {
  @Input() title: string = 'ดำเนินการด่วน';
  @Input() subtitle: string = 'งานที่ต้องดำเนินการ';
  @Input() actions: QuickAction[] = [];
  @Output() actionClicked = new EventEmitter<string>();

  onActionClick(action: string) {
    this.actionClicked.emit(action);
  }
}
