import { Component } from '@angular/core';

@Component({
  selector: 'app-patient-list',
  standalone: true,               // ต้องมีถ้าเป็น standalone component
  imports: [],                    // ใส่ module หรือ component ที่ใช้ (เช่น CommonModule)
  templateUrl: './patient-list.html',
  styleUrls: ['./patient-list.scss']  // แก้ชื่อเป็น styleUrls (พหูพจน์)
})
export class PatientList {}
