import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { QuestionnaireService } from '../../../core/services/questionnaire.service';
import { PatientQuestionnaire } from '../../../core/models/questionnaire.model';
import { afterMinDuration } from '../../../core/utils/min-duration';

import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-questionnaire-list',
  standalone: true,
  imports: [CommonModule, TableModule, TagModule, ButtonModule, ToastModule],
  templateUrl: './questionnaire-list.html',
  styleUrls: ['./questionnaire-list.scss'],
  providers: [MessageService],
})
export class QuestionnaireListComponent implements OnInit {
  questionnaires: PatientQuestionnaire[] = [];
  loading = false;

  constructor(
    private questionnaireService: QuestionnaireService,
    private router: Router,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    const startedAt = Date.now();

    this.questionnaireService.listAll().subscribe({
      next: (data) => {
        afterMinDuration(startedAt, () => {
          this.questionnaires = data;
          this.loading = false;
        });
      },
      error: (err) => {
        afterMinDuration(startedAt, () => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'ผิดพลาด',
            detail: 'โหลดรายการแบบสอบถามไม่สำเร็จ: ' + (err.error?.message || err.message),
          });
        });
      },
    });
  }

  patientName(q: PatientQuestionnaire): string {
    if (q.patient) return `${q.patient.first_name} ${q.patient.last_name}`.trim();
    const guestName = `${q.guest_first_name || ''} ${q.guest_last_name || ''}`.trim();
    return guestName ? `${guestName} (Guest)` : 'ไม่ระบุตัวตน (Guest)';
  }

  initials(q: PatientQuestionnaire): string {
    if (q.patient) {
      const a = q.patient.first_name?.charAt(0) || '';
      const b = q.patient.last_name?.charAt(0) || '';
      return (a + b).toUpperCase() || '?';
    }
    const a = q.guest_first_name?.charAt(0) || '';
    const b = q.guest_last_name?.charAt(0) || '';
    return (a + b).toUpperCase() || 'G';
  }

  statusLabel(status: string): string {
    if (status === 'submitted') return 'รอตรวจสอบ';
    if (status === 'reviewed') return 'ตรวจสอบแล้ว';
    return 'ฉบับร่าง';
  }

  statusSeverity(status: string): 'info' | 'success' | 'warn' {
    if (status === 'reviewed') return 'success';
    if (status === 'submitted') return 'warn';
    return 'info';
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  }

  viewDetail(q: PatientQuestionnaire): void {
    this.router.navigate(['/questionnaire/detail', q.id]);
  }
}
