// src/app/features/menu/menu.data.ts
import { MenuItem } from './menu.model';

export const MENU_CONFIG: MenuItem[] = [
  {
    label: 'Dashboard',
    icon: 'dashboard',
    route: '/dashboard',
    roles: ['guest', 'user', 'admin'], // ทุก role เห็น
  },
  {
    label: 'Finance',
    icon: 'article',
    roles: ['user', 'admin'], // ❌ guest ห้ามเห็น
    children: [
      { label: 'List', icon: 'post_add', route: '/finance/list', roles: ['user', 'admin'] },
      { label: 'Form', icon: 'category', route: '/finance/form', roles: ['user','admin'] }, // ✅ เฉพาะ admin
    ]
  },
  {
    label: 'Patient',
    icon: 'article',
    roles: ['user', 'admin'], // ❌ guest ห้ามเห็น
    children: [
      { label: 'List', icon: 'post_add', route: '/patient/list', roles: ['user', 'admin'] },
      { label: 'Form', icon: 'category', route: '/patient/form', roles: ['user','admin'] }, // ✅ เฉพาะ admin
    ]
  }
];
