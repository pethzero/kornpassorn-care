// src/app/pages/people/people-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FinanceSummaryComponent } from './finance-summary/finance-summary.component';
// import { Finance
import { AuthGuard } from '../../core/guards/auth-guard';

export const routes: Routes = [
  {
    path: 'summary',
    component: FinanceSummaryComponent,
    canActivate: [AuthGuard],
    data: { roles: ['user', 'admin'] }
  }
//   ,{
//     path: 'list',
//     component: FinanceListComponent,
//     canActivate: [AuthGuard],
//     data: { roles: ['user', 'admin'] }
//   },{
//     path: 'detail/:id',
//     component: FinanceDetailComponent,
//     canActivate: [AuthGuard],
//     data: { roles: ['user', 'admin'] }
//   }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FinanceRoutingModule {}
