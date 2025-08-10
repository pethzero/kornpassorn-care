import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { FinanceRoutingModule } from './finance-routing.module';
import { FinanceSummaryComponent } from './finance-summary/finance-summary.component';
import { FinanceListComponent } from './finance-list/finance-list.component';
import { FinanceFormComponent } from './finance-form/finance-form.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    FinanceRoutingModule,
    // Standalone components are imported automatically
    FinanceSummaryComponent,
    FinanceListComponent,
    FinanceFormComponent
  ],
  exports: [
    FinanceSummaryComponent,
    FinanceListComponent,
    FinanceFormComponent
  ]
})
export class FinanceModule { }
