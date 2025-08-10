import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMedicalTables1691555100000 implements MigrationInterface {
    name = 'CreateMedicalTables1691555100000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // สร้างตาราง patients
        await queryRunner.query(`
            CREATE TABLE "patients" (
                "id" SERIAL NOT NULL,
                "patient_code" character varying(20) NOT NULL,
                "first_name" character varying(100) NOT NULL,
                "last_name" character varying(100) NOT NULL,
                "gender" character varying(10),
                "date_of_birth" date,
                "phone" character varying(20),
                "email" character varying(100),
                "address" text,
                "emergency_contact_name" character varying(100),
                "emergency_contact_phone" character varying(20),
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_patients_patient_code" UNIQUE ("patient_code"),
                CONSTRAINT "PK_patients_id" PRIMARY KEY ("id")
            )
        `);

        // สร้างตาราง medical_records
        await queryRunner.query(`
            CREATE TABLE "medical_records" (
                "id" SERIAL NOT NULL,
                "patient_id" integer NOT NULL,
                "record_date" date NOT NULL,
                "chief_complaint" text,
                "present_illness" text,
                "past_medical_history" text,
                "vital_signs" text,
                "physical_examination" text,
                "diagnosis" text,
                "treatment_plan" text,
                "medications" text,
                "follow_up_instructions" text,
                "created_by" character varying(100),
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_medical_records_id" PRIMARY KEY ("id")
            )
        `);

        // สร้าง Foreign Key
        await queryRunner.query(`
            ALTER TABLE "medical_records" 
            ADD CONSTRAINT "FK_medical_records_patient_id" 
            FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "medical_records"`);
        await queryRunner.query(`DROP TABLE "patients"`);
    }
}
