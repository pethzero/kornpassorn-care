// src/app/pages/people/people-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PatientList } from './patient-list/patient-list';
import { PatientFormComponent } from './patient-form/patient-form';
import { AuthGuard } from '../../core/guards/auth-guard';

export const routes: Routes = [
  {
    path: 'list',
    component: PatientList,
    canActivate: [AuthGuard],
    data: { roles: ['user', 'admin'] }
  },
  {
    path: 'form',
    component: PatientFormComponent,
    canActivate: [AuthGuard],
    data: { roles: ['user', 'admin'] }
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PeopleRoutingModule {}
