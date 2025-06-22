import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminDashboard } from './admin-dashboard/admin-dashboard';
import { AdminSetting } from './admin-setting/admin-setting';

const routes: Routes = [
    { path: 'dashboard', component: AdminDashboard },
    { path: 'setting', component: AdminSetting },
];


@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class AdminRoutingModule { }
