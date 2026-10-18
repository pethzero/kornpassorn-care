import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminDashboard } from './admin-dashboard/admin-dashboard';

const routes: Routes = [
  { path: 'dashboard', component: AdminDashboard },
  // ย้ายไปหน้า ตั้งค่า (/settings) แล้ว — tab ผู้ใช้งาน
  { path: 'settings', redirectTo: '/settings?tab=users' },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
