import { Component, ViewChild, HostListener, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';

import { HeaderComponent } from '../header/header';
import { SidebarComponent } from '../sidebar/sidebar';

@Component({
  selector: 'app-full-layout',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    SidebarComponent,
    RouterOutlet,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatListModule
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
    // ปิด sidebar ถ้าเป็นมือถือหลัง view init
    if (this.isMobile) {
      this.sidenav.close();
    } else {
      this.sidenav.open();
    }
  }

  @HostListener('window:resize')
  checkScreenWidth() {
    this.isMobile = window.innerWidth < 768; // breakpoint สำหรับมือถือ
  }

  toggleSidebar() {
    this.sidenav.toggle();
  }

  // เพิ่ม method ปิด sidebar (ใช้จาก sidebar เมื่อเลือกเมนู)
  closeSidebarOnMobile() {
    if (this.isMobile) {
      this.sidenav.close();
    }
  }
}
