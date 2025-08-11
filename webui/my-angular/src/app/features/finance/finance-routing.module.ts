import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FinanceSummaryComponent } from './finance-summary/finance-summary.component';
import { FinanceFormComponent } from './finance-form/finance-form.component';
import { FinanceListComponent } from './finance-list/finance-list.component';

const routes: Routes = [
  { path: '', redirectTo: 'summary', pathMatch: 'full' },
  { 
    path: 'summary', 
    component: FinanceSummaryComponent,
    data: { title: 'Finance Summary' }
  },
  { 
    path: 'list', 
    component: FinanceListComponent,
    data: { title: 'Finance Records' }
  },
  { 
    path: 'add', 
    component: FinanceFormComponent,
    data: { title: 'Add Finance Record' }
  },
  { 
    path: 'edit/:id', 
    component: FinanceFormComponent,
    data: { title: 'Edit Finance Record' }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FinanceRoutingModule { }