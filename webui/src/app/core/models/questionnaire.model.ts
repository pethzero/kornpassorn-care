// src/app/core/models/questionnaire.model.ts
import { Patient } from '../../models/users/user.model';

export interface QuestionnaireQuestion {
  id: number;
  code: string;
  text: string;
  type: 'text' | 'radio' | 'checkbox' | 'yesno';
  choices?: string[];
  is_required: boolean;
}

export interface QuestionnaireAnswerInput {
  question_id: number;
  answer_text?: string;
}

export interface PatientQuestionnaireAnswer {
  id: number;
  questionnaire_id: number;
  question_id: number;
  question?: QuestionnaireQuestion;
  answer_text?: string;
  answered_at: string;
}

export interface PatientQuestionnaire {
  id: number;
  patient_id?: number;
  patient?: Patient;
  guest_first_name?: string;
  guest_last_name?: string;
  created_at: string;
  updated_at: string;
  status: 'draft' | 'submitted' | 'reviewed';
  note?: string;
  answers?: PatientQuestionnaireAnswer[];
}
