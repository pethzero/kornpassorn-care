import { Component, ViewChild, HostListener, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';

import { HeaderComponent } from '../header/header';
import { SidebarComponent } from '../sidebar/sidebar';

import { ToastModule } from 'primeng/toast'; // ✅ import ToastModule
import { MessageService } from 'primeng/api';


@Component({
  selector: 'app-full-layout',
  standalone: true,
  providers: [MessageService], // ✅ ต้อง provide ที่นี่
  imports: [
    CommonModule,
    HeaderComponent,
    SidebarComponent,
    RouterOutlet,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatListModule,
    ToastModule,
],
  templateUrl: './full-layout.html',
  styleUrls: ['./full-layout.scss']
})
export class FullLayoutComponent implements AfterViewInit {
  @ViewChild('sidenav') sidenav!: MatSidenav;

  isMobile = false;

  constructor() {
    this.checkScreenWidth();
  }

  ngAfterViewInit() {
    // ตั้งค่า sidebar ตามขนาดหน้าจอ
    if (this.isMobile) {
      this.sidenav.close();
    } else {
      this.sidenav.open();
    }
  }

  @HostListener('window:resize')
  checkScreenWidth() {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth < 768;
    
    // ถ้าเปลี่ยนจาก mobile เป็น desktop หรือกลับกัน
    if (wasMobile !== this.isMobile && this.sidenav) {
      if (this.isMobile) {
        this.sidenav.close();
      } else {
        this.sidenav.open();
      }
    }
  }

  toggleSidebar() {
    this.sidenav.toggle();
  }

  // ปิด sidebar เมื่อเลือกเมนูใน mobile
  closeSidebarOnMobile() {
    if (this.isMobile && this.sidenav.opened) {
      this.sidenav.close();
    }
  }
}
