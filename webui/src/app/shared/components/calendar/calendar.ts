import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // เพิ่มตรงนี้

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule], // เพิ่ม FormsModule
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss'
})
export class CalendarComponent {
  year = 2025;
  month = 0; // มกราคม (0-based)
  workweekOnly = false;

  get monthName() {
    return [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ][this.month];
  }

  get calendarMatrix() {
    const firstDay = new Date(this.year, this.month, 1);
    const lastDay = new Date(this.year, this.month + 1, 0);
    const matrix: (number | null)[][] = [];
    let week: (number | null)[] = [];
    let dayOfWeek = firstDay.getDay(); // 0=อาทิตย์, 1=จันทร์, ...
    let date = 1;

    // ปรับให้เริ่มจันทร์ (workweek)
    let startDay = this.workweekOnly ? 1 : 0;
    let endDay = this.workweekOnly ? 5 : 6;

    // เติมช่องว่างก่อนวันแรก
    for (let i = startDay; i < dayOfWeek; i++) week.push(null);

    while (date <= lastDay.getDate()) {
      if (week.length > endDay - startDay) {
        matrix.push(week);
        week = [];
      }
      week.push(date++);
      if (week.length === endDay - startDay + 1) {
        matrix.push(week);
        week = [];
      }
    }
    // เติมช่องว่างหลังวันสุดท้าย
    while (week.length < endDay - startDay + 1) week.push(null);
    if (week.some(d => d !== null)) matrix.push(week);

    return matrix;
  }

  prevMonth() {
    if (this.month === 0) {
      this.month = 11;
      this.year--;
    } else {
      this.month--;
    }
  }

  nextMonth() {
    if (this.month === 11) {
      this.month = 0;
      this.year++;
    } else {
      this.month++;
    }
  }
}