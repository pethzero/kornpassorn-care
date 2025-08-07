// src/app/pages/people/people-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PatientList } from './patient-list/patient-list';
import { PatientFormComponent } from './patient-form/patient-form';
import { AuthGuard } from '../../core/guards/auth-guard';

export const routes: Routes = [
  {
    path: 'patient-list',
    component: PatientList,
    canActivate: [AuthGuard],
    data: { roles: ['user', 'admin'] }
  },
  {
    path: 'patient-form',
    component: PatientFormComponent,
    canActivate: [AuthGuard],
    data: { roles: ['user', 'admin'] }
  },
  // {
  //   path: 'patient-questionnaire',
  //   loadComponent: () => import('./patient-questionnaire/patient-questionnaire').then(m => m.PatientQuestionnaireComponent),
  //   canActivate: [AuthGuard],
  //   data: { roles: ['user', 'admin'] }
  // }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PeopleRoutingModule {}
