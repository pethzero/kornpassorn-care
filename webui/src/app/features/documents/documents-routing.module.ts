// src/app/features/documents/documents-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth-guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./document-list/document-list').then((m) => m.DocumentListComponent),
    canActivate: [AuthGuard],
    data: { roles: ['user', 'admin'] },
    title: 'เอกสาร',
  },
  {
    // ?type=receive|issue|patient_service|adjust  &product_id=  &package_id=  &patient_id=
    path: 'new',
    loadComponent: () => import('./document-form/document-form').then((m) => m.DocumentFormComponent),
    canActivate: [AuthGuard],
    data: { roles: ['user', 'admin'] },
    title: 'สร้างเอกสาร',
  },
  {
    path: ':id',
    loadComponent: () => import('./document-detail/document-detail').then((m) => m.DocumentDetailComponent),
    canActivate: [AuthGuard],
    data: { roles: ['user', 'admin'] },
    title: 'รายละเอียดเอกสาร',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DocumentsRoutingModule {}
