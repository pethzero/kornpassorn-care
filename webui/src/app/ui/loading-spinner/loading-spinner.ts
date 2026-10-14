import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  templateUrl: './loading-spinner.html',
  styleUrls: ['./loading-spinner.scss'],
  imports: [CommonModule]
})
export class LoadingSpinnerComponent {
  @Input() size = 56;
  @Input() message = '';
  @Input() overlay = false;
}
