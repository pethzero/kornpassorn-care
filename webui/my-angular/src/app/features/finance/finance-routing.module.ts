import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FinanceSummaryComponent } from './finance-summary/finance-summary.component';
import { FinanceListComponent } from './finance-list/finance-list.component';
import { FinanceFormComponent } from './finance-form/finance-form.component';
import { AuthGuard } from '../../core/guards/auth-guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'summary',
    pathMatch: 'full'
  },
  {
    path: 'summary',
    component: FinanceSummaryComponent,
    canActivate: [AuthGuard],
    data: { title: 'สรุปการเงิน' }
  },
  {
    path: 'list',
    component: FinanceListComponent,
    canActivate: [AuthGuard],
    data: { title: 'รายการการเงิน' }
  },
  {
    path: 'add',
    component: FinanceFormComponent,
    canActivate: [AuthGuard],
    data: { title: 'เพิ่มรายการการเงิน', mode: 'add' }
  },
  {
    path: 'edit/:id',
    component: FinanceFormComponent,
    canActivate: [AuthGuard],
    data: { title: 'แก้ไขรายการการเงิน', mode: 'edit' }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FinanceRoutingModule { }
