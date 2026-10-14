import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Patient } from './medical.entity';

@Entity({ name: 'questionnaire_question' })
export class QuestionnaireQuestion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 64, unique: true })
  code: string;

  @Column({ type: 'text' })
  text: string;

  // 'text' | 'radio' | 'checkbox' | 'yesno'
  @Column({ length: 32 })
  type: string;

  @Column({ type: 'text', array: true, nullable: true })
  choices?: string[];

  @Column({ name: 'is_required', default: false })
  is_required: boolean;
}

@Entity({ name: 'patient_questionnaire' })
export class PatientQuestionnaire {
  @PrimaryGeneratedColumn()
  id: number;

  // nullable: guest ที่ login แบบ anonymous (ไม่มี Patient record) ก็ส่งแบบสอบถามได้ — เดิม NOT NULL
  // ตอนนี้ผ่อนเป็น nullable เพราะไม่มีตัวตนให้ผูก ไม่ใช่สร้าง Patient หลอกๆ ทิ้งไว้ในระบบ
  @Column({ nullable: true })
  patient_id?: number;

  @ManyToOne(() => Patient, { nullable: true })
  @JoinColumn({ name: 'patient_id' })
  patient?: Patient;

  // ชื่อ-นามสกุลแบบไม่บังคับที่ guest กรอกเอง (ไม่ผูกกับ Patient record ใดๆ) — ใช้แสดงผลให้เจ้าหน้าที่ดูเท่านั้น
  @Column({ name: 'guest_first_name', length: 100, nullable: true })
  guest_first_name?: string;

  @Column({ name: 'guest_last_name', length: 100, nullable: true })
  guest_last_name?: string;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  created_at: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updated_at: Date;

  // 'draft' | 'submitted' | 'reviewed'
  @Column({ length: 32, default: 'draft' })
  status: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @OneToMany(() => PatientQuestionnaireAnswer, (a) => a.questionnaire)
  answers: PatientQuestionnaireAnswer[];
}

@Entity({ name: 'patient_questionnaire_answer' })
export class PatientQuestionnaireAnswer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  questionnaire_id: number;

  @ManyToOne(() => PatientQuestionnaire, (q) => q.answers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'questionnaire_id' })
  questionnaire: PatientQuestionnaire;

  @Column()
  question_id: number;

  @ManyToOne(() => QuestionnaireQuestion)
  @JoinColumn({ name: 'question_id' })
  question: QuestionnaireQuestion;

  @Column({ name: 'answer_text', type: 'text', nullable: true })
  answer_text?: string;

  @Column({ name: 'answered_at', type: 'timestamptz', default: () => 'now()' })
  answered_at: Date;
}
