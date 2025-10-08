// sidebar.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';

import { MenuService } from '../../features/menu/menu.service';
import { MenuItem } from '../../features/menu/menu.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatListModule, MatIconModule, MatDividerModule, MatExpansionModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.scss'],
})
export class SidebarComponent {
  menus: MenuItem[] = [];
  currentPath = '';

  constructor(private menuService: MenuService, private router: Router) {
    this.menus = this.menuService.getMenus();

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: NavigationEnd) => {
      this.currentPath = e.urlAfterRedirects;
    });
  }

  onMenuClick(event?: Event) {
    if (event && (event.target as HTMLElement).closest('.expandable')) {
      return;
    }
    this.closeSidebar.emit();
  }

  toggleSubmenu(label: string, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.menuService.toggleSubmenu(label);
  }

  isSubmenuExpanded(label: string): boolean {
    return this.menuService.isExpanded(label);
  }

  @Input() isSidebarOpen = true;
  @Output() closeSidebar = new EventEmitter<void>();
}
