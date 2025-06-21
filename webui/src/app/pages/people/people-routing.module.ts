// src/app/pages/people/people-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PatientList } from './patient-list/patient-list';

const routes: Routes = [
  { path: 'patient-list', component: PatientList }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PeopleRoutingModule {}
