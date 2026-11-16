import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  PatientQuestionnaire,
  PatientQuestionnaireAnswer,
  QuestionnaireQuestion,
} from '../../../database/entities/questionnaire.entity';
import { SubmitQuestionnaireDto } from './dto/submit-questionnaire.dto';

@Injectable()
export class QuestionnaireService {
  constructor(
    @InjectRepository(QuestionnaireQuestion) private readonly questionRepo: Repository<QuestionnaireQuestion>,
    @InjectRepository(PatientQuestionnaire) private readonly questionnaireRepo: Repository<PatientQuestionnaire>,
    @InjectRepository(PatientQuestionnaireAnswer) private readonly answerRepo: Repository<PatientQuestionnaireAnswer>,
  ) {}

  // คำถามแทบไม่เปลี่ยน — cache 60 วินาที กด F5 รัว ๆ จะได้ไม่อ่าน DB ทุกครั้ง
  private questionsCache: { at: number; data: Promise<QuestionnaireQuestion[]> } | null = null;

  listActiveQuestions(): Promise<QuestionnaireQuestion[]> {
    if (!this.questionsCache || Date.now() - this.questionsCache.at > 60_000) {
      const data = this.questionRepo.find({ order: { id: 'ASC' } });
      this.questionsCache = { at: Date.now(), data };
      data.catch(() => (this.questionsCache = null)); // โหลดพลาด อย่าจำไว้
    }
    return this.questionsCache.data;
  }

  async submit(patientId: number | null, dto: SubmitQuestionnaireDto) {
    dto.answers = await this.cleanAnswers(dto.answers);

    const questionnaire = await this.questionnaireRepo.save(
      this.questionnaireRepo.create({
        patient_id: patientId ?? undefined,
        status: 'submitted',
        note: dto.note,
        // เก็บเฉพาะตอนไม่มี patient ผูกอยู่แล้ว (guest) — patient ตัวจริงใช้ชื่อจาก Patient record แทน
        guest_first_name: patientId ? undefined : dto.guest_first_name,
        guest_last_name: patientId ? undefined : dto.guest_last_name,
      }),
    );

    const answers = dto.answers.map((a) =>
      this.answerRepo.create({
        questionnaire_id: questionnaire.id,
        question_id: a.question_id,
        answer_text: a.answer_text,
      }),
    );
    await this.answerRepo.save(answers);

    return this.getDetail(questionnaire.id);
  }

  // ไม่เชื่อหน้าเว็บ: ตัดคำถามที่ไม่มีจริง/ซ้ำ/ว่าง และเช็กคำถามบังคับเองอีกรอบ
  private async cleanAnswers(answers: SubmitQuestionnaireDto['answers']) {
    const questions = await this.listActiveQuestions();
    const byId = new Map(questions.map((q) => [q.id, q]));
    const seen = new Set<number>();
    const cleaned = answers.filter((a) => {
      if (!byId.has(a.question_id) || seen.has(a.question_id)) return false;
      seen.add(a.question_id);
      a.answer_text = a.answer_text?.trim() || undefined;
      return true;
    });

    const answered = new Set(cleaned.filter((a) => a.answer_text).map((a) => a.question_id));
    const missing = questions.filter((q) => q.is_required && !answered.has(q.id));
    if (missing.length) throw new BadRequestException(`กรุณาตอบคำถามที่จำเป็นให้ครบ (${missing.length} ข้อ)`);
    return cleaned;
  }

  listForPatient(patientId: number) {
    return this.questionnaireRepo.find({ where: { patient_id: patientId }, order: { created_at: 'DESC' } });
  }

  listAll(limit = 20, offset = 0) {
    return this.questionnaireRepo.find({
      relations: ['patient'],
      order: { created_at: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async getDetail(id: number) {
    const questionnaire = await this.questionnaireRepo.findOne({ where: { id }, relations: ['patient'] });
    if (!questionnaire) throw new NotFoundException('ไม่พบแบบสอบถาม');

    const answers = await this.answerRepo.find({ where: { questionnaire_id: id }, relations: ['question'] });
    return { ...questionnaire, answers };
  }

  async updateStatus(id: number, status: string) {
    await this.questionnaireRepo.update(id, { status, updated_at: new Date() });
    return this.getDetail(id);
  }
}
