import { Injectable, NotFoundException } from '@nestjs/common';
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

  listActiveQuestions() {
    return this.questionRepo.find({ order: { id: 'ASC' } });
  }

  async submit(patientId: number | null, dto: SubmitQuestionnaireDto) {
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
