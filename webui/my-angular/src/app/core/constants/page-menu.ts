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
        { path: '/finance', label: 'รายรับ-รายจ่าย', icon: 'today' },
        // { path: '/dashboard/reports/monthly', label: 'รายเดือน', icon: 'date_range' }
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
  ],
  '/finance': [
    {
      path: '/finance/summary',
      label: 'สรุปการเงิน',
      icon: 'account_balance',
      expanded: false,
    },
    {
      path: '/finance/list',
      label: 'รายการการเงิน',
      icon: 'receipt_long',
      expanded: false,
    },
    {
      path: '/finance/add',
      label: 'เพิ่มรายการ',
      icon: 'add_circle',
      expanded: false,
    },
    {
      path: '/finance',
      label: 'จัดการการเงิน',
      icon: 'account_balance_wallet',
      expanded: true,
      children: [
        { path: '/finance/summary', label: 'สรุปการเงิน', icon: 'bar_chart' },
        { path: '/finance/list', label: 'รายการทั้งหมด', icon: 'list' },
        { path: '/finance/add', label: 'เพิ่มรายการ', icon: 'add' }
      ]
    }
  ]
  // เพิ่มเมนูอื่นๆ ตาม path ได้
};