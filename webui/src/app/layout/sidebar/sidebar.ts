import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { AuthService } from '../../core/services/auth.service';
import { filter } from 'rxjs/operators';
import { PAGE_MENUS, PageMenuItem } from '../../core/constants/page-menu';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatListModule,
    MatIconModule,
    MatDividerModule,
    MatExpansionModule,
  ],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.scss'],
  animations: [
    trigger('slideInOut', [
      state('in', style({ transform: 'translateX(0%)' })),
      state('out', style({ transform: 'translateX(-100%)' })),
      transition('in <=> out', animate('300ms ease-in-out')),
    ])
  ]
})
export class SidebarComponent {
  userRole: string;
  currentPath: string = '';
  pageMenu: PageMenuItem[] = [];

  constructor(private auth: AuthService, private router: Router) {
    this.userRole = this.auth.getCurrentUser()?.role || 'guest';

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: NavigationEnd) => {
      this.currentPath = e.urlAfterRedirects;
    });
  }

  ngOnInit() {
    // สมมุติว่าคุณใช้ currentPath หรือ route ปัจจุบัน
    const mainPath = this.currentPath.split('/')[1] ? '/' + this.currentPath.split('/')[1] : '/dashboard';
    this.pageMenu = PAGE_MENUS[mainPath] || [];
  }

  onMenuClick() {
    this.closeSidebar.emit();
  }

  @Input() isSidebarOpen = true;
  @Output() closeSidebar = new EventEmitter<void>();
  

menu = {name: 'KRONPASSORN',};

}
