// src/app/features/finance-transactions/finance-transaction-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth-guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
  {
    path: 'list',
    loadComponent: () => import('./transaction-list/transaction-list').then((m) => m.TransactionListComponent),
    canActivate: [AuthGuard],
    data: { roles: ['user', 'admin'] },
    title: 'รายการเอกสารการเงิน',
  },
  {
    path: 'form',
    loadComponent: () => import('./transaction-form/transaction-form').then((m) => m.TransactionFormComponent),
    canActivate: [AuthGuard],
    data: { roles: ['user', 'admin'] },
    title: 'สร้างเอกสารการเงิน',
  },
  {
    path: ':id',
    loadComponent: () => import('./transaction-detail/transaction-detail').then((m) => m.TransactionDetailComponent),
    canActivate: [AuthGuard],
    data: { roles: ['user', 'admin'] },
    title: 'รายละเอียดเอกสารการเงิน',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FinanceTransactionRoutingModule {}
