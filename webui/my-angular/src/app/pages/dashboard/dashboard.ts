import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

// PrimeNG imports
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { ChartModule } from 'primeng/chart';

// Custom components
import { StatCardComponent } from '../../ui/stat-card/stat-card';
import { PersonCardComponent } from '../../ui/person-card/person-card';
import { SimplePersonCardComponent } from '../../ui/simple-person-card/simple-person-card';



export interface Patient {
  id: number;
  name: string;
  age: number;
  gender: string;
  appointmentDate: string;
  status: string;
  department: string;
}

export interface FinanceRecord {
  id: number;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    CardModule, 
    TableModule, 
    ButtonModule, 
    TagModule, 
    ProgressBarModule,
    ChartModule,
    // StatCardComponent,
    // PersonCardComponent,
    SimplePersonCardComponent
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class DashboardComponent implements OnInit {
  stats = {
    totalPatients: 2345,
    newPatientsToday: 23,
    appointmentsToday: 45,
    inExamRoom: 5,
    // Finance stats
    totalIncome: 125000,
    totalExpenses: 75000,
    netProfit: 50000,
    totalTransactions: 152,
    // Person-related stats
    activePatients: 23,
    doctorsOnDuty: 8,
    nursesOnDuty: 15,
    waitingQueue: 7
  };

  patients: Patient[] = [
    {
      id: 1,
      name: 'นายสมชาย ใจดี',
      age: 35,
      gender: 'ชาย',
      appointmentDate: '2025-08-11 09:00',
      status: 'รอตรวจ',
      department: 'อายุรกรรม'
    },
    {
      id: 2,
      name: 'นางสาวสมหญิง สุขใจ',
      age: 28,
      gender: 'หญิง',
      appointmentDate: '2025-08-11 10:30',
      status: 'กำลังตรวจ',
      department: 'ศัลยกรรม'
    },
    {
      id: 3,
      name: 'นายวิชัย มั่นคง',
      age: 42,
      gender: 'ชาย',
      appointmentDate: '2025-08-11 11:00',
      status: 'เสร็จแล้ว',
      department: 'ออร์โธปิดิกส์'
    },
    {
      id: 4,
      name: 'นางรัตนา เจริญสุข',
      age: 56,
      gender: 'หญิง',
      appointmentDate: '2025-08-11 14:00',
      status: 'รอตรวจ',
      department: 'โรคหัวใจ'
    },
    {
      id: 5,
      name: 'นายปรีชา วิทยาศรี',
      age: 31,
      gender: 'ชาย',
      appointmentDate: '2025-08-11 15:30',
      status: 'รอตรวจ',
      department: 'ตา หู คอ จมูก'
    }
  ];

  financeRecords: FinanceRecord[] = [
    {
      id: 1,
      date: '2025-08-11',
      description: 'ค่าตรวจรักษา - นายสมชาย',
      category: 'รายได้การรักษา',
      amount: 1500,
      type: 'income'
    },
    {
      id: 2,
      date: '2025-08-11',
      description: 'ค่ายา - นางสาวสมหญิง',
      category: 'รายได้ค่ายา',
      amount: 850,
      type: 'income'
    },
    {
      id: 3,
      date: '2025-08-11',
      description: 'ค่าซื้ออุปกรณ์การแพทย์',
      category: 'อุปกรณ์',
      amount: 12000,
      type: 'expense'
    },
    {
      id: 4,
      date: '2025-08-10',
      description: 'ค่าตรวจเอกซเรย์',
      category: 'รายได้การตรวจ',
      amount: 600,
      type: 'income'
    },
    {
      id: 5,
      date: '2025-08-10',
      description: 'ค่าไฟฟ้า',
      category: 'ค่าสาธารณูปโภค',
      amount: 3200,
      type: 'expense'
    }
  ];

  // Chart data for PrimeNG
  patientGenderChart: any;
  monthlyPatientsChart: any;

  ngOnInit() {
    this.initCharts();
    this.calculateFinanceStats();
  }

  calculateFinanceStats() {
    const income = this.financeRecords
      .filter(record => record.type === 'income')
      .reduce((sum, record) => sum + record.amount, 0);
    
    const expenses = this.financeRecords
      .filter(record => record.type === 'expense')
      .reduce((sum, record) => sum + record.amount, 0);

    this.stats.totalIncome = income;
    this.stats.totalExpenses = expenses;
    this.stats.netProfit = income - expenses;
    this.stats.totalTransactions = this.financeRecords.length;
  }

  initCharts() {
    // Patient Gender Chart
    this.patientGenderChart = {
      labels: ['ชาย', 'หญิง'],
      datasets: [
        {
          data: [60, 40],
          backgroundColor: ['#3B82F6', '#EC4899'],
          hoverBackgroundColor: ['#2563EB', '#DB2777']
        }
      ]
    };

    // Monthly Patients Chart
    this.monthlyPatientsChart = {
      labels: ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม'],
      datasets: [
        {
          label: 'ผู้ป่วยรายเดือน',
          data: [30, 45, 28, 50, 42],
          backgroundColor: '#10B981',
          borderColor: '#059669',
          borderWidth: 1
        }
      ]
    };
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' | undefined {
    switch (status) {
      case 'เสร็จแล้ว':
        return 'success';
      case 'กำลังตรวจ':
        return 'warning';
      case 'รอตรวจ':
        return 'info';
      default:
        return 'secondary';
    }
  }

  getAmountClass(type: 'income' | 'expense'): string {
    return type === 'income' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold';
  }

  formatAmount(amount: number, type: 'income' | 'expense'): string {
    const prefix = type === 'income' ? '+' : '-';
    return `${prefix}${amount.toLocaleString('th-TH')} ฿`;
  }
}
