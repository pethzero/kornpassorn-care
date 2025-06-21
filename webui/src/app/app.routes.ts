import { Routes } from '@angular/router';
import { FullLayoutComponent } from './layout/full-layout/full-layout';
import { AuthGuard } from './core/guards/auth-guard';  // import guard เข้ามา

export const routes: Routes = [
  {
    path: '',
    component: FullLayoutComponent,
    children: [
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
        path: 'admin-area',
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
          // {
          //   path: 'secure',
          //   canMatch: [AuthGuard],
          //   loadComponent: () => import('./pages/secure/secure').then(m => m.SecureComponent),
          //   data: { roles: ['admin'] }
          // },
          // 
          // {
          //   path: 'users',
          //   loadComponent: () => import('./pages/admin/admin-routing.module').then(m => m.UsersPage)
          // }
        ]
      }

    ],
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.LoginComponent)
  }
];
