import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  PatientQuestionnaire,
  QuestionnaireAnswerInput,
  QuestionnaireQuestion,
} from '../models/questionnaire.model';

@Injectable({ providedIn: 'root' })
export class QuestionnaireService {
  private apiUrl = `${environment.apiUrl}/questionnaire`;

  constructor(private http: HttpClient) {}

  // ---- patient-facing ----
  getQuestions(): Observable<QuestionnaireQuestion[]> {
    return this.http.get<QuestionnaireQuestion[]>(`${this.apiUrl}/questions`);
  }

  submit(
    answers: QuestionnaireAnswerInput[],
    note?: string,
    guestName?: { guest_first_name?: string; guest_last_name?: string },
  ): Observable<PatientQuestionnaire> {
    return this.http.post<PatientQuestionnaire>(`${this.apiUrl}/submit`, { answers, note, ...guestName });
  }

  getMyQuestionnaires(): Observable<PatientQuestionnaire[]> {
    return this.http.get<PatientQuestionnaire[]>(`${this.apiUrl}/my`);
  }

  // ---- staff-facing ----
  listAll(limit = 20, offset = 0): Observable<PatientQuestionnaire[]> {
    return this.http.get<PatientQuestionnaire[]>(this.apiUrl, { params: { limit, offset } as any });
  }

  getDetail(id: number): Observable<PatientQuestionnaire> {
    return this.http.get<PatientQuestionnaire>(`${this.apiUrl}/${id}`);
  }

  updateStatus(id: number, status: string): Observable<PatientQuestionnaire> {
    return this.http.patch<PatientQuestionnaire>(`${this.apiUrl}/${id}/status`, { status });
  }
}
