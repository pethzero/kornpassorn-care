import { Routes } from '@angular/router';
import { FullLayoutComponent } from './layout/full-layout/full-layout';
import { AuthGuard } from './core/guards/auth-guard';  // import guard เข้ามา
import { LoginRedirectGuard } from './core/guards/login-redirect.guard';

export const routes: Routes = [
  {
    path: '',
    component: FullLayoutComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardComponent),
        canActivate: [AuthGuard],
        data: { roles: ['guest', 'user', 'admin'] }  // ให้ guest, user, admin เข้าได้
      },
      {
        path: 'patient',
        loadChildren: () => import('./pages/people/people-routing.module').then(m => m.PeopleRoutingModule),
        canActivate: [AuthGuard],
        data: { roles: ['user', 'admin'] } // ให้ user และ admin เข้าได้
      },
      {
        path: 'admin',
        canActivateChild: [AuthGuard], // 👈 ใช้ CanActivateChild
        data: { roles: ['admin'] },
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/admin/admin-routing.module').then(m => m.AdminRoutingModule)
          },
          {
            path: 'settings',
            loadComponent: () => import('./pages/admin/admin-routing.module').then(m => m.AdminRoutingModule)
          },
        ]
      }
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
  // {
  //   path: 'logout',
  //   loadComponent: () => import('./pages/logout/logout.component').then(m => m.LogoutComponent),
  //   data: { roles: ['guest', 'user', 'admin'] }
  // },
  {
    path: 'example',
    loadComponent: () => import('./pages/example/example').then(m => m.ExampleComponent),
    data: { roles: ['guest', 'user', 'admin'] }
  }
];

