import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './user/login';
import { AdminLoginComponent } from './admin/admin-login';

const routes: Routes = [
  { path: 'login-user', component: LoginComponent },  // path login-user
  { path: 'admin-login', component: AdminLoginComponent }
];


@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class LoginRoutingModule { }
