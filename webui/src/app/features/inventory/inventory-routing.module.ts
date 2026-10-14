// src/app/features/inventory/inventory-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth-guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'products',
    pathMatch: 'full',
  },
  {
    path: 'products',
    loadComponent: () => import('./product-list/product-list').then((m) => m.ProductListComponent),
    canActivate: [AuthGuard],
    data: { roles: ['user', 'admin'] },
    title: 'สินค้า',
  },
  {
    path: 'lots',
    loadComponent: () => import('./lot-list/lot-list').then((m) => m.LotListComponent),
    canActivate: [AuthGuard],
    data: { roles: ['user', 'admin'] },
    title: 'ล็อตสินค้า',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class InventoryRoutingModule {}
