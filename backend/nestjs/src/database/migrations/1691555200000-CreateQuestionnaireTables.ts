import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateQuestionnaireTables1691555200000 implements MigrationInterface {
    name = 'CreateQuestionnaireTables1691555200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ตารางหลักสำหรับเก็บแบบสอบถามแต่ละชุด
        await queryRunner.query(`
            CREATE TABLE "patient_questionnaire" (
                "id" SERIAL NOT NULL,
                "patient_id" integer NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "status" character varying(32) NOT NULL DEFAULT 'draft',
                "note" text,
                CONSTRAINT "PK_patient_questionnaire_id" PRIMARY KEY ("id")
            )
        `);

        // เก็บคำถามแต่ละข้อ (master)
        await queryRunner.query(`
            CREATE TABLE "questionnaire_question" (
                "id" SERIAL NOT NULL,
                "code" character varying(64) NOT NULL,
                "text" text NOT NULL,
                "type" character varying(32) NOT NULL,
                "choices" text[],
                "is_required" boolean NOT NULL DEFAULT false,
                CONSTRAINT "UQ_questionnaire_question_code" UNIQUE ("code"),
                CONSTRAINT "PK_questionnaire_question_id" PRIMARY KEY ("id")
            )
        `);

        // เก็บคำตอบของแต่ละ patient questionnaire
        await queryRunner.query(`
            CREATE TABLE "patient_questionnaire_answer" (
                "id" SERIAL NOT NULL,
                "questionnaire_id" integer NOT NULL,
                "question_id" integer NOT NULL,
                "answer_text" text,
                "answered_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_patient_questionnaire_answer_id" PRIMARY KEY ("id")
            )
        `);

        // Foreign Keys
        await queryRunner.query(`
            ALTER TABLE "patient_questionnaire" 
            ADD CONSTRAINT "FK_patient_questionnaire_patient_id" 
            FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "patient_questionnaire_answer" 
            ADD CONSTRAINT "FK_patient_questionnaire_answer_questionnaire_id" 
            FOREIGN KEY ("questionnaire_id") REFERENCES "patient_questionnaire"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "patient_questionnaire_answer" 
            ADD CONSTRAINT "FK_patient_questionnaire_answer_question_id" 
            FOREIGN KEY ("question_id") REFERENCES "questionnaire_question"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "patient_questionnaire_answer"`);
        await queryRunner.query(`DROP TABLE "questionnaire_question"`);
        await queryRunner.query(`DROP TABLE "patient_questionnaire"`);
    }
}
