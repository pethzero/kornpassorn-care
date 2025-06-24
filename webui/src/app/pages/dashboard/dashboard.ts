import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { BaseChartDirective } from 'ng2-charts';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { PatientList } from "../people/patient-list/patient-list";

export interface Patient {
  id: number;
  name: string;
  age: number;
  gender: string;
  appointmentDate: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, BaseChartDirective, PatientList],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class DashboardComponent {
  stats = {
    totalPatients: 2345,
    newPatientsToday: 23,
    appointmentsToday: 45,
    inExamRoom: 5,
  };

  public chartData = {
    labels: ['ชาย', 'หญิง'],
    datasets: [
      {
        label: 'จำนวนคนไข้',
        data: [60, 40],
        backgroundColor: ['#3b82f6', '#ec4899'], // น้ำเงิน - ชมพู
        borderWidth: 1,
      },
    ],
  };

  public chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' as const },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 10,
        },
      },
    },
  };
  public chartType: 'bar' = 'bar';

  public chartData2 = {
    labels: ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม'],
    datasets: [
      {
        label: 'ยอดผู้ป่วยรายเดือน',
        data: [30, 45, 28, 50, 42],
        backgroundColor: '#10b981', // สีเขียว
        borderWidth: 1,
      },
    ],
  };
  
  public chartOptions2 = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 10 },
      },
    },
  };
  
  public chartType2: 'bar' = 'bar';
  
}
