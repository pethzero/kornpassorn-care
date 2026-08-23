import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-not-found',
  templateUrl: './not-found.html',
  styleUrls: ['./not-found.scss'],
  imports: [CommonModule, RouterModule]
})
export class NotFoundComponent {}
