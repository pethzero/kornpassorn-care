import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-money-card',
  standalone: true,
  imports: [CommonModule, CardModule],
  templateUrl: './money-card.html',
  styleUrls: ['./money-card.scss']
})
export class UIMoneyCard {
  @Input() totalItems: number = 0;
  @Input() incomeToday: number = 0;
  @Input() expenseToday: number = 0;
}
