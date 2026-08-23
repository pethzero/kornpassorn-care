import { Component, ViewChild, HostListener, AfterViewInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';

import { HeaderComponent } from '../header/header';
import { SidebarComponent } from '../sidebar/sidebar';

import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-full-layout',
  standalone: true,
  providers: [MessageService],
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

  // Config: sidebar เริ่มต้นเปิดหรือปิด
  private readonly SIDEBAR_INITIAL_STATE = {
    desktop: false,  // false = ปิด, true = เปิด
    mobile: false    // false = ปิด, true = เปิด
  };

  isMobile = false;
  isSidebarOpen = false;

  constructor(private ngZone: NgZone) {
    this.checkScreenWidth();
  }

  ngAfterViewInit() {
    // ตั้งค่า sidebar ตาม initial state config
    const shouldOpen = this.isMobile 
      ? this.SIDEBAR_INITIAL_STATE.mobile 
      : this.SIDEBAR_INITIAL_STATE.desktop;

    if (shouldOpen) {
      this.sidenav.open();
    } else {
      this.sidenav.close();
    }
  }

  @HostListener('window:resize')
  checkScreenWidth() {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth < 768;

    // เมื่อ resize ให้ปิด sidebar (ป้องกันปัญหา layout)
    if (wasMobile !== this.isMobile && this.sidenav) {
      this.sidenav.close();
    }
  }

  toggleSidebar() {
    // ปรับ class/CSS ภายนอก Angular เพื่อลด CD cycles
    this.ngZone.runOutsideAngular(() => {
      this.isSidebarOpen = !this.isSidebarOpen;
      this.sidenav.toggle();
      // ถ้าจำเป็นเรียก back into Angular เพียงเมื่อต้อง update data-binding ที่จำเป็น:
      // this.ngZone.run(() => {});
    });
  }

  closeSidebarOnMobile() {
    if (this.isMobile && this.sidenav.opened) {
      this.sidenav.close();
    }
  }
}
