// logout.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
    standalone: true,
    selector: 'app-logout',
    template: '', // ไม่ต้องมี UI
})


export class LogoutComponent implements OnInit {
    user: any;
    constructor(private auth: AuthService, private router: Router) { }
        
    ngOnInit(): void {
        this.user = this.auth.getCurrentUser();
        console.log(  this.user )
        // this.auth.logout();
        // if (this.user.role === 'admin') {
        //     this.router.navigate(['/admin-login']);
        // } else {
        //     this.router.navigate(['/login']);
        // }
    }
}