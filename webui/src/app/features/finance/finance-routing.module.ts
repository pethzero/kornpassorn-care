import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth-guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full'
  },
  {
    path: 'list',
    loadComponent: () => import('./finance-list/finance-list.component').then(m => m.FinanceListComponent),
    canActivate: [AuthGuard],
    data: { roles: ['user', 'admin'] },
    title: 'บัญชีการเงิน'
  },
  // ฟอร์มย้ายไปเป็น dialog ในหน้ารายการแล้ว — คงลิงก์เดิมไว้ให้เปิด dialog แทน
  {
    path: 'form',
    redirectTo: '/finance/list?new=1',
    pathMatch: 'full'
  },
  {
    path: 'form/:id',
    redirectTo: ({ params }) => `/finance/list?edit=${params['id']}`
  },
  {
    path: 'summary',
    loadComponent: () => import('./finance-summary/finance-summary.component').then(m => m.FinanceSummaryComponent),
    canActivate: [AuthGuard],
    data: { roles: ['user', 'admin'] },
    title: 'สรุปยอดการเงิน'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FinanceRoutingModule {}
