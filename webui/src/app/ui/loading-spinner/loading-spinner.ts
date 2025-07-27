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
  @Input() size = 48; // px
  @Input() color = '#1976d2';
}