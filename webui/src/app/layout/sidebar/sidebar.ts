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

  constructor(private auth: AuthService, private router: Router) {
    this.userRole = this.auth.getCurrentUser()?.role || 'guest';

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: NavigationEnd) => {
      this.currentPath = e.urlAfterRedirects;
    });
  }

  onMenuClick() {
    this.closeSidebar.emit();
  }

  @Input() isSidebarOpen = true;
  @Output() closeSidebar = new EventEmitter<void>();
  

menu = {
  name: 'KRONPASSORN',
  heads: [
    {
      label: 'Dashboard',
      expandable: false,
      link: '/dashboard',
      icon: 'dashboard',
      roles: ['guest', 'user', 'admin']  // ทุก role เข้าถึงได้
    },
    {
      label: 'Patient',
      expandable: false,
      link: '/patient',
      icon: 'people',
      roles: ['user', 'admin']          // เฉพาะ user/admin
    },
    {
      label: 'Admin Settings',
      expandable: false,
      link: '/settings',
      icon: 'settings',
      roles: ['admin']                  // เฉพาะ admin
    },
    {
      label: 'Components',
      expandable: true,
      roles: ['user', 'admin'],
      details: [
        { label: 'Accordion', icon: 'unfold_more', link: '/components/accordion' },
        { label: 'Breadcrumb', icon: 'linear_scale', link: '/components/breadcrumb' }
      ]
    }
  ]
};

}
