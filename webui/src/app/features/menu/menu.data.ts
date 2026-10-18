// src/app/features/menu/menu.data.ts
import { MenuItem } from './menu.model';

export const MENU_CONFIG: MenuItem[] = [
  {
    label: 'แดชบอร์ด',
    icon: 'dashboard',
    route: '/dashboard',
    roles: ['user', 'admin'], // guest มีหน้าของตัวเองแล้ว (ดูด้านล่าง)
  },
  // เมนูเฉพาะ guest (anonymous, ไม่มีเบอร์โทร/OTP)
  {
    label: 'หน้าหลัก',
    icon: 'home',
    route: '/guest-dashboard',
    roles: ['guest'],
  },
  {
    label: 'กรอกแบบสอบถาม',
    icon: 'quiz',
    route: '/questionnaire-fill',
    roles: ['guest'], // guest แบบ anonymous — patient ใช้เมนู "แบบสอบถาม" ของตัวเองด้านล่าง
  },
  {
    // เอกสาร = งานประจำวัน (รับของ/บริการคนไข้/เบิก/ปรับยอด) — ขยับสต็อกและลงบัญชีให้เอง
    label: 'เอกสาร',
    icon: 'receipt_long',
    roles: ['user', 'admin'],
    children: [
      { label: 'รายการเอกสาร', icon: 'post_add', route: '/documents', roles: ['user', 'admin'] },
      { label: 'สร้างเอกสาร', icon: 'add_box', route: '/documents/new', roles: ['user', 'admin'] },
    ]
  },
  {
    // บัญชีการเงิน = รายรับ/รายจ่าย (มาจากเอกสารอัตโนมัติ + บันทึกเองเช่น ค่าไฟ ค่าเช่า)
    label: 'บัญชีการเงิน',
    icon: 'account_balance_wallet',
    roles: ['user', 'admin'], // ❌ guest ห้ามเห็น
    children: [
      // ปุ่ม "บันทึกรายรับ/รายจ่ายอื่น" อยู่ในหน้ารายรับ-รายจ่ายแล้ว (เปิดเป็น dialog) จึงไม่ต้องมีเมนูแยก
      { label: 'รายรับ-รายจ่าย', icon: 'receipt', route: '/finance/list', roles: ['user', 'admin'] },
      { label: 'สรุปยอด', icon: 'bar_chart', route: '/finance/summary', roles: ['user','admin'] },
    ]
  },
  {
    label: 'นัดหมาย',
    icon: 'event',
    route: '/appointments',
    roles: ['user', 'admin'],
  },
  {
    label: 'คลังสินค้า',
    icon: 'inventory_2',
    roles: ['user', 'admin'],
    children: [
      { label: 'สินค้า', icon: 'category', route: '/inventory/products', roles: ['user', 'admin'] },
      { label: 'ล็อตสินค้า', icon: 'local_pharmacy', route: '/inventory/lots', roles: ['user', 'admin'] },
    ]
  },
  {
    label: 'ผู้ป่วย',
    icon: 'article',
    roles: ['user', 'admin'], // ❌ guest ห้ามเห็น
    children: [
      { label: 'รายชื่อผู้ป่วย', icon: 'post_add', route: '/patient/list', roles: ['user', 'admin'] },
      { label: 'เพิ่ม/แก้ไขผู้ป่วย', icon: 'category', route: '/patient/form', roles: ['user','admin'] }, // ✅ เฉพาะ admin

    ]
  },
  {
    label: 'แบบสอบถามผู้ป่วย',
    icon: 'quiz',
    route: '/questionnaire/list',
    roles: ['user', 'admin'],
  },
  {
    // ระบบภายนอกที่เชื่อมต่อ API — เฉพาะ admin
    label: 'เชื่อมต่อระบบภายนอก',
    icon: 'api',
    roles: ['admin'],
    children: [
      { label: 'API Clients', icon: 'vpn_key', route: '/api-clients', roles: ['admin'] },
      { label: 'เอกสาร API', icon: 'menu_book', route: '/developers', roles: ['admin'] },
    ]
  },
  {
    label: 'เวลาทำการโรงพยาบาล',
    icon: 'schedule',
    route: '/hospital-schedule',
    roles: ['user', 'admin'],
  },
  // เมนูเฉพาะคนไข้ (login ด้วยเบอร์โทร+OTP) — คนละชุดกับเมนูของเจ้าหน้าที่ด้านบน
  {
    label: 'หน้าหลัก',
    icon: 'home',
    route: '/portal/dashboard',
    roles: ['patient'],
  },
  {
    label: 'แบบสอบถาม',
    icon: 'quiz',
    route: '/portal/questionnaire',
    roles: ['patient'],
  },
  {
    label: 'โปรไฟล์ของฉัน',
    icon: 'person',
    route: '/portal/profile',
    roles: ['patient'],
  },
];
