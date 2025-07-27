import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-logo',
  standalone: true,
  templateUrl: './logo.html',
  styleUrls: ['./logo.scss']
})
export class LogoComponent {
  @Input() size = 48; // px
}