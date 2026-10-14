import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { QuestionnaireService } from '../../../core/services/questionnaire.service';
import { PatientQuestionnaire } from '../../../core/models/questionnaire.model';
import { LoadingSpinnerComponent } from '../../../ui/loading-spinner/loading-spinner';
import { afterMinDuration } from '../../../core/utils/min-duration';

import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-questionnaire-detail',
  standalone: true,
  imports: [CommonModule, ButtonModule, TagModule, ToastModule, LoadingSpinnerComponent],
  templateUrl: './questionnaire-detail.html',
  styleUrls: ['./questionnaire-detail.scss'],
  providers: [MessageService],
})
export class QuestionnaireDetailComponent implements OnInit {
  questionnaire: PatientQuestionnaire | null = null;
  loading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private questionnaireService: QuestionnaireService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.load(id);
  }

  load(id: number): void {
    this.loading = true;
    const startedAt = Date.now();

    this.questionnaireService.getDetail(id).subscribe({
      next: (data) => {
        afterMinDuration(startedAt, () => {
          this.questionnaire = data;
          this.loading = false;
        });
      },
      error: (err) => {
        afterMinDuration(startedAt, () => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'ผิดพลาด',
            detail: 'โหลดข้อมูลไม่สำเร็จ: ' + (err.error?.message || err.message),
          });
        });
      },
    });
  }

  patientName(): string {
    const p = this.questionnaire?.patient;
    if (p) return `${p.first_name} ${p.last_name}`.trim();
    const guestName = `${this.questionnaire?.guest_first_name || ''} ${this.questionnaire?.guest_last_name || ''}`.trim();
    return guestName ? `${guestName} (Guest)` : 'ไม่ระบุตัวตน (Guest)';
  }

  formatDate(date?: string): string {
    if (!date) return '-';
    return new Intl.DateTimeFormat('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  }

  markReviewed(): void {
    if (!this.questionnaire) return;
    this.questionnaireService.updateStatus(this.questionnaire.id, 'reviewed').subscribe({
      next: (data) => {
        this.questionnaire = data;
        this.messageService.add({ severity: 'success', summary: 'สำเร็จ', detail: 'ทำเครื่องหมายว่าตรวจสอบแล้ว' });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'ผิดพลาด',
          detail: 'อัปเดตสถานะไม่สำเร็จ: ' + (err.error?.message || err.message),
        });
      },
    });
  }

  back(): void {
    this.router.navigate(['/questionnaire/list']);
  }
}
