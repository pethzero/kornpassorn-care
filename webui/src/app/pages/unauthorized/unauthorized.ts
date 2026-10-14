import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-unauthorized',
  templateUrl: './unauthorized.html',
  styleUrls: ['./unauthorized.scss'],
  imports: [CommonModule, RouterModule]
})
export class UnauthorizedComponent {}
