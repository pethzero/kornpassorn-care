// src/app/features/patient/patient-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PatientList } from './patient-list/patient-list';
import { PatientFormComponent } from './patient-form/patient-form';
import { AuthGuard } from '../../core/guards/auth-guard';

const staff = { canActivate: [AuthGuard], data: { roles: ['user', 'admin'] } };

export const routes: Routes = [
  // เดิมไม่มี path '' → เข้า /patient แล้วได้หน้าว่าง
  { path: '', pathMatch: 'full', redirectTo: 'list' },
  { path: 'list', component: PatientList, title: 'คนไข้', ...staff },
  // เพิ่มใหม่ = /patient/form, แก้ไข = /patient/form?id=
  { path: 'form', component: PatientFormComponent, title: 'ข้อมูลคนไข้', ...staff },
  // ต้องอยู่ท้ายสุด ไม่งั้น "list"/"form" จะถูกตีความเป็น id
  {
    path: ':id',
    loadComponent: () => import('./patient-detail/patient-detail').then((m) => m.PatientDetailComponent),
    title: 'ข้อมูลคนไข้',
    ...staff,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PeopleRoutingModule {}
