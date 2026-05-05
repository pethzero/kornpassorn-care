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
    title: 'รายการการเงิน'
  },
  {
    path: 'form',
    loadComponent: () => import('./finance-form/finance-form.component').then(m => m.FinanceFormComponent),
    canActivate: [AuthGuard],
    data: { roles: ['user', 'admin'] },
    title: 'เพิ่มรายการการเงิน'
  },
  {
    path: 'form/:id',
    loadComponent: () => import('./finance-form/finance-form.component').then(m => m.FinanceFormComponent),
    canActivate: [AuthGuard],
    data: { roles: ['user', 'admin'] },
    title: 'แก้ไขรายการการเงิน'
  },
  {
    path: 'summary',
    loadComponent: () => import('./finance-summary/finance-summary.component').then(m => m.FinanceSummaryComponent),
    canActivate: [AuthGuard],
    data: { roles: ['user', 'admin'] },
    title: 'สรุปการเงิน'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FinanceRoutingModule {}
