import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { QuestionnaireService } from '../../../core/services/questionnaire.service';
import { QuestionnaireAnswerInput, QuestionnaireQuestion } from '../../../core/models/questionnaire.model';
import { AuthService } from '../../../core/services/auth.service';
import { LoadingSpinnerComponent } from '../../../ui/loading-spinner/loading-spinner';
import { afterMinDuration } from '../../../core/utils/min-duration';

import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-questionnaire-fill',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, ToastModule, LoadingSpinnerComponent],
  templateUrl: './questionnaire-fill.html',
  styleUrls: ['./questionnaire-fill.scss'],
  providers: [MessageService],
})
export class QuestionnaireFillComponent implements OnInit {
  questions: QuestionnaireQuestion[] = [];
  answers: Record<number, string> = {};
  checkboxAnswers: Record<number, Set<string>> = {};
  note = '';
  guestFirstName = '';
  guestLastName = '';
  loading = false;
  loadingMessage = '';
  submitted = false;

  get isGuest(): boolean {
    return this.auth.getCurrentUser()?.role === 'guest';
  }

  constructor(
    private questionnaireService: QuestionnaireService,
    private router: Router,
    private auth: AuthService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.loadingMessage = 'กำลังโหลดแบบสอบถาม...';
    const startedAt = Date.now();

    this.questionnaireService.getQuestions().subscribe({
      next: (questions) => {
        afterMinDuration(startedAt, () => {
          this.questions = questions;
          questions.forEach((q) => {
            if (q.type === 'checkbox') this.checkboxAnswers[q.id] = new Set();
          });
          this.loading = false;
        });
      },
      error: (err) => {
        afterMinDuration(startedAt, () => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'ผิดพลาด',
            detail: 'โหลดแบบสอบถามไม่สำเร็จ: ' + (err.error?.message || err.message),
          });
        });
      },
    });
  }

  toggleCheckbox(questionId: number, choice: string, checked: boolean): void {
    const set = this.checkboxAnswers[questionId] ?? new Set<string>();
    if (checked) set.add(choice);
    else set.delete(choice);
    this.checkboxAnswers[questionId] = set;
  }

  isChecked(questionId: number, choice: string): boolean {
    return this.checkboxAnswers[questionId]?.has(choice) ?? false;
  }

  private buildAnswers(): QuestionnaireAnswerInput[] {
    return this.questions.map((q) => {
      if (q.type === 'checkbox') {
        const chosen = Array.from(this.checkboxAnswers[q.id] ?? []);
        return { question_id: q.id, answer_text: chosen.join(', ') };
      }
      return { question_id: q.id, answer_text: this.answers[q.id] };
    });
  }

  private hasMissingRequired(): boolean {
    return this.questions.some((q) => {
      if (!q.is_required) return false;
      if (q.type === 'checkbox') return !(this.checkboxAnswers[q.id]?.size);
      return !this.answers[q.id];
    });
  }

  submit(): void {
    if (this.loading) return;

    if (this.hasMissingRequired()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'แจ้งเตือน',
        detail: 'กรุณากรอกคำถามที่จำเป็นให้ครบถ้วน',
      });
      return;
    }

    this.loading = true;
    this.loadingMessage = 'กำลังบันทึกแบบสอบถาม...';
    const startedAt = Date.now();

    const guestName = this.isGuest
      ? { guest_first_name: this.guestFirstName || undefined, guest_last_name: this.guestLastName || undefined }
      : undefined;

    this.questionnaireService.submit(this.buildAnswers(), this.note, guestName).subscribe({
      next: () => {
        afterMinDuration(startedAt, () => {
          this.loading = false;
          this.submitted = true;
        });
      },
      error: (err) => {
        afterMinDuration(startedAt, () => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'ผิดพลาด',
            detail: 'บันทึกแบบสอบถามไม่สำเร็จ: ' + (err.error?.message || err.message),
          });
        });
      },
    });
  }

  backToDashboard(): void {
    const role = this.auth.getCurrentUser()?.role;
    let target = '/dashboard';
    if (role === 'patient') target = '/portal/dashboard';
    else if (role === 'guest') target = '/guest-dashboard';
    this.router.navigate([target]);
  }
}
