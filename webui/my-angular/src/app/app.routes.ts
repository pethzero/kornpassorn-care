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
        loadChildren: () => import('./features/patient/patient-routing.module').then(m => m.PeopleRoutingModule),
        canActivate: [AuthGuard],
        data: { roles: ['guest', 'user', 'admin'] } // ให้ user และ admin เข้าได้
      },
      {
        path: 'admin',
        canActivateChild: [AuthGuard],
        data: { roles: ['admin'] },
        loadChildren: () => import('./pages/admin/admin-routing.module').then(m => m.AdminRoutingModule)
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

