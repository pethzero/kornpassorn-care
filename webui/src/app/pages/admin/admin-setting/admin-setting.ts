import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-setting',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-setting.html',
  styleUrl: './admin-setting.scss'
})
export class AdminSetting {
  username: string | null = null;

  constructor() {
    const token = localStorage.getItem('token'); // หรือชื่อ key ที่คุณใช้จริง
    console.log('sss', token);
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      this.username = payload.username || null;
      console.log('sss', this.username);
    }
  }

}
