import { Routes } from '@angular/router';
import { FullLayoutComponent } from './layout/full-layout/full-layout';

export const routes: Routes = [
  {
    path: '',
    component: FullLayoutComponent,
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardComponent)
      },
      {
        path: 'example',
        loadComponent: () => import('./pages/example/example').then(m => m.ExampleComponent)
      },
    ],
  },
];


