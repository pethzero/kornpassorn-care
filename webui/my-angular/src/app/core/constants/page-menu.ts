export interface PageMenuItem {
  path: string;
  label: string;
  icon?: string;
  children?: PageMenuItem[];
  expanded?: boolean;
  roles?: string[];
  external?: boolean;
}

export const PAGE_MENUS: Record<string, PageMenuItem[]> = {
  '/dashboard': [
    {
      path: '/dashboard',
      label: 'แดชบอร์ด',
      icon: 'dashboard',
      expanded: false,
    },
    {
      path: '/dashboard/overview',
      label: 'ภาพรวม',
      icon: 'insights',
      expanded: false,
    },
    {
      path: '/dashboard/reports',
      label: 'รายงาน',
      icon: 'bar_chart',
      expanded: true,
      children: [
        { path: '/dashboard/reports/daily', label: 'รายวัน', icon: 'today' },
        { path: '/dashboard/reports/monthly', label: 'รายเดือน', icon: 'date_range' }
      ]
    }
  ],
  '/patient': [
    {
      path: '/patient',
      label: 'รายชื่อคนไข้',
      icon: 'people',
      expanded: false,
    },
    {
      path: '/patient/patient-form',
      label: 'เพิ่มคนไข้',
      icon: 'person_add',
      expanded: false,
    }
  ]
  // เพิ่มเมนูอื่นๆ ตาม path ได้
};