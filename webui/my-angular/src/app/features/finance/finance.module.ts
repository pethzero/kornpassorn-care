import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinanceRoutingModule } from './finance-routing.module';

// Components
import { FinanceSummaryComponent } from './finance-summary/finance-summary.component';
import { FinanceFormComponent } from './finance-form/finance-form.component';
import { FinanceListComponent } from './finance-list/finance-list.component';

@NgModule({
  declarations: [
    // Components are standalone, so we don't declare them here
  ],
  imports: [
    CommonModule,
    FinanceRoutingModule,
    // Standalone components will be imported in routing
    FinanceSummaryComponent,
    FinanceFormComponent,
    FinanceListComponent
  ]
})
export class FinanceModule { }