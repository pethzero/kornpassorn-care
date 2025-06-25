import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';  // ต้อง import สำหรับ *ngFor, *ngIf
import { MatCardModule } from '@angular/material/card';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  templateUrl: './example.html',
  styleUrls: ['./example.scss']
})
export class ExampleComponent {
  user: any;

  constructor(private auth: AuthService, private router: Router) { }

  ngOnInit(): void {
    this.user = this.auth.getCurrentUser();
    console.log(this.user)
  }

  items = [
    { name: 'Apple', type: 'fruit' },
    { name: 'Carrot', type: 'vegetable' },
    { name: 'Banana', type: 'fruit' },
    { name: 'Broccoli', type: 'vegetable' }
  ];

  showFruitOnly = true;  // ใช้เป็นเงื่อนไขใน *ngIf
}
