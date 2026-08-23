-- Table: public.patient_questionnaire_answer

-- DROP TABLE IF EXISTS public.patient_questionnaire_answer;

CREATE TABLE IF NOT EXISTS public.patient_questionnaire_answer
(
    id integer NOT NULL DEFAULT nextval('patient_questionnaire_answer_id_seq'::regclass),
    questionnaire_id integer NOT NULL,
    question_id integer NOT NULL,
    answer_text text COLLATE pg_catalog."default",
    answered_at timestamp with time zone DEFAULT now(),
    CONSTRAINT patient_questionnaire_answer_pkey PRIMARY KEY (id),
    CONSTRAINT patient_questionnaire_answer_question_id_fkey FOREIGN KEY (question_id)
        REFERENCES public.questionnaire_question (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT patient_questionnaire_answer_questionnaire_id_fkey FOREIGN KEY (questionnaire_id)
        REFERENCES public.patient_questionnaire (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.patient_questionnaire_answer
    OWNER to postgres;
-- Index: idx_questionnaire_answer_questionnaire_id

-- DROP INDEX IF EXISTS public.idx_questionnaire_answer_questionnaire_id;

CREATE INDEX IF NOT EXISTS idx_questionnaire_answer_questionnaire_id
    ON public.patient_questionnaire_answer USING btree
    (questionnaire_id ASC NULLS LAST)
    TABLESPACE pg_default;