// src/app/features/menu/menu.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MenuItem } from './menu.model';
import { MENU_CONFIG } from './menu.data';
import { AuthService } from '../../core/services/auth.service'; // ของคุณ

@Injectable({ providedIn: 'root' })
export class MenuService {
  private expandedMenus: { [key: string]: boolean } = {};

  constructor(private auth: AuthService) {}

  toggleSubmenu(label: string) {
    this.expandedMenus[label] = !this.expandedMenus[label];
  }

  isExpanded(label: string): boolean {
    return !!this.expandedMenus[label];
  }

  getMenus(): MenuItem[] {
    const role = this.auth.getCurrentUser()?.role || 'guest';
    return this.filterMenusByRole(MENU_CONFIG, role);
  }

  private filterMenusByRole(menus: MenuItem[], role: string): MenuItem[] {
    return menus
      .filter(menu => !menu.roles || menu.roles.includes(role))
      .map(menu => ({
        ...menu,
        children: menu.children ? this.filterMenusByRole(menu.children, role) : undefined
      }));
  }
}
