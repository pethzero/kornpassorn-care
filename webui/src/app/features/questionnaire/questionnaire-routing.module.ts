import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { QuestionnaireListComponent } from './questionnaire-list/questionnaire-list';
import { QuestionnaireDetailComponent } from './questionnaire-detail/questionnaire-detail';

export const routes: Routes = [
  { path: 'list', component: QuestionnaireListComponent },
  { path: 'detail/:id', component: QuestionnaireDetailComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class QuestionnaireRoutingModule {}
