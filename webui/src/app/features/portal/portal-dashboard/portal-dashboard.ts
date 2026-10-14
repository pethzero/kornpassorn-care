import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-portal-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portal-dashboard.html',
  styleUrls: ['./portal-dashboard.scss'],
})
export class PortalDashboardComponent implements OnInit {
  patientName = '';

  constructor(private router: Router, private auth: AuthService) {}

  ngOnInit(): void {
    this.auth.getMyPatientProfile().subscribe({
      next: (patient) => {
        const name = `${patient.first_name} ${patient.last_name}`.trim();
        this.patientName = name && name !== '-' ? name : '';
      },
      error: () => {},
    });
  }

  goTo(path: string): void {
    this.router.navigate([path]);
  }

  openHospitalHours(): void {
    window.open('/hospital-hours', '_blank');
  }
}
