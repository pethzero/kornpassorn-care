// src/app/features/menu/menu.model.ts
export interface MenuItem {
  label: string;
  icon?: string;
  route?: string;
  children?: MenuItem[];
  roles?: string[]; // ระบุว่าเมนูนี้ใครเข้าถึงได้
}
