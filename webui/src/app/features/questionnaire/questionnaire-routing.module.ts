import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { QuestionnaireListComponent } from './questionnaire-list/questionnaire-list';
import { QuestionnaireDetailComponent } from './questionnaire-detail/questionnaire-detail';

export const routes: Routes = [
  // /questionnaire และ /questionnaire/detail → รายการ (ปุ่มย้อนกลับขึ้นหน้าแม่ได้ตอนเปิดลิงก์ตรง)
  { path: '', pathMatch: 'full', redirectTo: 'list' },
  { path: 'list', component: QuestionnaireListComponent },
  { path: 'detail', pathMatch: 'full', redirectTo: 'list' },
  { path: 'detail/:id', component: QuestionnaireDetailComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class QuestionnaireRoutingModule {}
