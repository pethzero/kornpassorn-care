import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-simple-person-card',
  standalone: true,
  imports: [CommonModule, CardModule],
  template: `
    <div class="simple-person-card">
      <div class="card-header">
        <div class="card-title">{{ title }}</div>
      </div>
      
      <div class="card-body">
        <div class="number">{{ value }}</div>
      </div>
    </div>
  `,
  styleUrls: ['./simple-person-card.scss']
})
export class SimplePersonCardComponent {
  @Input() title: string = '';
  @Input() value: number = 0;
  @Input() subtitle?: string;
  @Input() icon: string = 'pi pi-user';
  @Input() iconColor: string = 'blue';
  @Input() status?: string;

  get iconClass(): string {
    return `bg-${this.iconColor}`;
  }
}
