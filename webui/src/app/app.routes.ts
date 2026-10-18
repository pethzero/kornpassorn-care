import { Routes } from '@angular/router';
import { FullLayoutComponent } from './layout/full-layout/full-layout';
import { AuthGuard } from './core/guards/auth-guard';  // import guard เข้ามา
import { LoginRedirectGuard } from './core/guards/login-redirect.guard';
import { HomeRedirectGuard } from './core/guards/home-redirect.guard';

export const routes: Routes = [
  {
    path: '',
    component: FullLayoutComponent,
    children: [
      {
        // เดิม redirectTo: 'dashboard' ตรงๆ ทำให้ guest/patient เข้า '/' แล้วโดน AuthGuard
        // เด้งไป /unauthorized (เพราะ /dashboard เฉพาะ role user/admin) -> ใช้ guard เลือกปลายทางตาม role แทน
        path: '',
        pathMatch: 'full',
        canActivate: [HomeRedirectGuard],
        loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardComponent),
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardComponent),
        canActivate: [AuthGuard],
        data: { roles: ['user', 'admin'] } // guest มีหน้าของตัวเองแล้วที่ /guest-dashboard
      },
      {
        // guest เห็นแดชบอร์ดคนละแบบ — โชว์ตารางเวลาหมอ (จาก hospital-schedule) แทนข้อมูลของเจ้าหน้าที่
        path: 'guest-dashboard',
        loadComponent: () => import('./features/guest/guest-dashboard/guest-dashboard').then(m => m.GuestDashboardComponent),
        canActivate: [AuthGuard],
        data: { roles: ['guest'] }
      },
      {
        path: 'patient',
        loadChildren: () => import('./features/patient/patient-routing.module').then(m => m.PeopleRoutingModule),
        canActivate: [AuthGuard],
        data: { roles: ['guest', 'user', 'admin'] } // ให้ user และ admin เข้าได้
      },
      {
        path: 'finance',
        loadChildren: () => import('./features/finance/finance-routing.module').then(m => m.FinanceRoutingModule),
        canActivate: [AuthGuard],
        data: { roles: ['user', 'admin'] } // ให้ user และ admin เข้าได้
      },
      {
        // เอกสาร (รับของเข้า / บริการคนไข้ / เบิก / ปรับยอด) — ขยับสต็อก และลงบัญชีการเงิน (/finance) ให้อัตโนมัติ
        path: 'documents',
        loadChildren: () => import('./features/documents/documents-routing.module').then(m => m.DocumentsRoutingModule),
        canActivate: [AuthGuard],
        data: { roles: ['user', 'admin'] }
      },
      {
        path: 'appointments',
        loadComponent: () => import('./features/appointments/appointment-list').then(m => m.AppointmentListComponent),
        canActivate: [AuthGuard],
        data: { roles: ['user', 'admin'] },
        title: 'นัดหมาย'
      },
      {
        // ระบบภายนอกที่เรียก API ได้ (/api/v1/*) — สร้าง/ปิด/สร้าง secret ใหม่
        path: 'api-clients',
        loadComponent: () => import('./features/api-clients/api-client-list').then(m => m.ApiClientListComponent),
        canActivate: [AuthGuard],
        data: { roles: ['admin'] },
        title: 'API Clients'
      },
      {
        // บัญชีของฉัน / อุปกรณ์ (ทุกคน) + ผู้ใช้งาน / คลินิก & บริการ (admin — ซ่อน tab เอง, API เช็ก role อีกชั้น)
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings').then(m => m.SettingsComponent),
        canActivate: [AuthGuard],
        data: { roles: ['user', 'admin'] },
        title: 'ตั้งค่า'
      },
      // ลิงก์เก่าก่อนเปลี่ยนชื่อเป็น "เอกสาร"
      { path: 'finance-transactions', children: [{ path: '**', redirectTo: '/documents' }] },
      {
        // คลังสินค้า/ยา แบบมีล็อตและวันหมดอายุ — ของเข้า/ออกผ่านเอกสาร (/documents)
        path: 'inventory',
        loadChildren: () => import('./features/inventory/inventory-routing.module').then(m => m.InventoryRoutingModule),
        canActivate: [AuthGuard],
        data: { roles: ['user', 'admin'] }
      },
      {
        path: 'questionnaire',
        loadChildren: () => import('./features/questionnaire/questionnaire-routing.module').then(m => m.QuestionnaireRoutingModule),
        canActivate: [AuthGuard],
        data: { roles: ['user', 'admin'] } // เจ้าหน้าที่ดูแบบสอบถามผู้ป่วย
      },
      {
        // guest (anonymous, ไม่มีเบอร์โทร/OTP) กรอกแบบสอบถามได้ตรงนี้ — คนละ path กับ /portal/questionnaire ของ patient
        // เพราะ /portal ทั้งหมดถูกจำกัดไว้เฉพาะ role patient (ดู comment ด้านล่าง)
        path: 'questionnaire-fill',
        loadComponent: () => import('./features/questionnaire/questionnaire-fill/questionnaire-fill').then(m => m.QuestionnaireFillComponent),
        canActivate: [AuthGuard],
        data: { roles: ['guest'] } // patient ใช้ /portal/questionnaire อยู่แล้ว
      },
      {
        path: 'hospital-schedule',
        loadComponent: () => import('./features/hospital-schedule/hospital-schedule-admin/hospital-schedule-admin').then(m => m.HospitalScheduleAdminComponent),
        canActivate: [AuthGuard],
        data: { roles: ['user', 'admin'] } // เจ้าหน้าที่ตั้งเวลาทำการ
      },
      {
        path: 'admin',
        canActivateChild: [AuthGuard],
        data: { roles: ['admin'] },
        loadChildren: () => import('./pages/admin/admin-routing.module').then(m => m.AdminRoutingModule)
      },
      // พอร์ทัลสำหรับคนไข้ที่ login ด้วยเบอร์โทร+OTP — ห้ามเพิ่ม 'patient' ใน roles ของ route อื่นด้านบน
      // เพื่อกันไม่ให้คนไข้เข้าหน้าจัดการของเจ้าหน้าที่ได้ (ดูรายละเอียดที่ PatientController ฝั่ง backend)
      {
        path: 'portal',
        canActivate: [AuthGuard],
        data: { roles: ['patient'] },
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
          {
            path: 'dashboard',
            loadComponent: () => import('./features/portal/portal-dashboard/portal-dashboard').then(m => m.PortalDashboardComponent),
          },
          {
            path: 'profile',
            loadComponent: () => import('./features/portal/portal-profile/portal-profile').then(m => m.PortalProfileComponent),
          },
          {
            path: 'questionnaire',
            loadComponent: () => import('./features/questionnaire/questionnaire-fill/questionnaire-fill').then(m => m.QuestionnaireFillComponent),
          },
        ],
      },
    ],
  }, {
    path: 'login',
    canActivate: [LoginRedirectGuard],
    loadComponent: () => import('./pages/login/user/login').then(m => m.LoginComponent)
  },
  {
    path: 'admin-login', // เปลี่ยนเป็น admin/login
    canActivate: [LoginRedirectGuard],
    loadComponent: () => import('./pages/login/admin/admin-login').then(m => m.AdminLoginComponent)
  },
  {
    path: 'patient-login',
    canActivate: [LoginRedirectGuard],
    loadComponent: () => import('./pages/login/patient/patient-login').then(m => m.PatientLoginComponent)
  },
  {
    // สาธารณะ — คนทั่วไปดูได้โดยไม่ต้อง login (อยู่นอก FullLayoutComponent/AuthGuard โดยตั้งใจ)
    path: 'hospital-hours',
    loadComponent: () => import('./pages/hospital-hours/hospital-hours').then(m => m.HospitalHoursComponent)
  },
  {
    // เอกสาร API สำหรับผู้เชื่อมต่อภายนอก — เปิดได้โดยไม่ต้อง login (ไม่มีข้อมูลลับ)
    path: 'developers',
    loadComponent: () => import('./pages/developers/developers').then(m => m.DevelopersComponent),
    title: 'Kornpassorn Care API'
  },
  {
    // AuthGuard เด้งมาที่นี่เมื่อ role ไม่ตรงกับ route ที่ขอเข้า -> ต้องอยู่นอก AuthGuard เอง
    // ไม่งั้นจะวนลูปเด้งซ้ำ และต้องห้ามมี redirectTo ไป route ที่ติด AuthGuard ด้วยเหตุผลเดียวกัน
    path: 'unauthorized',
    loadComponent: () => import('./pages/unauthorized/unauthorized').then(m => m.UnauthorizedComponent)
  },
  {
    path: 'example',
    loadComponent: () => import('./pages/example/example').then(m => m.ExampleComponent),
    data: { roles: ['guest', 'user', 'admin'] }
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found').then(m => m.NotFoundComponent)
  }
];

