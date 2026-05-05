import { Component, ViewChild, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { Patient } from '../../../models/users/user.model';
import { PatientService } from '../../../core/services/patient.service';
import { FormBuilder } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';


// export interface Patient {
//   id: number;
//   name: string;
//   age: number;
//   gender: string;
//   appointmentDate: string;
// }

// const PATIENT_DATA: Patient[] = [
//   { id: 1, name: 'Somchai', age: 35, gender: 'ชาย', appointmentDate: '2025-06-01' },
//   { id: 2, name: 'Suda', age: 28, gender: 'หญิง', appointmentDate: '2025-06-02' },
//   { id: 3, name: 'Anan', age: 42, gender: 'ชาย', appointmentDate: '2025-06-03' },
//   { id: 4, name: 'Niran', age: 30, gender: 'ชาย', appointmentDate: '2025-06-04' },
//   { id: 5, name: 'Patchara', age: 27, gender: 'หญิง', appointmentDate: '2025-06-05' },
//   { id: 6, name: 'Wichai', age: 33, gender: 'ชาย', appointmentDate: '2025-06-06' },
//   { id: 7, name: 'Pimchanok', age: 40, gender: 'หญิง', appointmentDate: '2025-06-07' },
//   { id: 8, name: 'Krit', age: 45, gender: 'ชาย', appointmentDate: '2025-06-08' },
//   { id: 9, name: 'Malee', age: 36, gender: 'หญิง', appointmentDate: '2025-06-09' },
//   { id: 10, name: 'Somsak', age: 39, gender: 'ชาย', appointmentDate: '2025-06-10' },
// ];

@Component({
  selector: 'app-patient-list',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatPaginatorModule, MatSortModule],
  templateUrl: './patient-list.html',
  styleUrls: ['./patient-list.scss'],
})
export class PatientList implements OnInit, AfterViewInit {

  constructor(
    private fb: FormBuilder,
    private patientService: PatientService,
    private auth: AuthService
  ) { }


  // displayedColumns: string[] = ['id', 'name', 'age', 'gender', 'appointmentDate'];
  // dataSource = new MatTableDataSource<Patient>(PATIENT_DATA);

  // @ViewChild(MatPaginator) paginator!: MatPaginator;
  // @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void { 
    
  }
  ngAfterViewInit() {
    // this.dataSource.paginator = this.paginator;
    // this.dataSource.sort = this.sort;
  }
}
