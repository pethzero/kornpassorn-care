-- Table: public.questionnaire_question

-- DROP TABLE IF EXISTS public.questionnaire_question;

CREATE TABLE IF NOT EXISTS public.questionnaire_question
(
    id integer NOT NULL DEFAULT nextval('questionnaire_question_id_seq'::regclass),
    code character varying(64) COLLATE pg_catalog."default" NOT NULL,
    text text COLLATE pg_catalog."default" NOT NULL,
    type character varying(32) COLLATE pg_catalog."default" NOT NULL,
    choices text[] COLLATE pg_catalog."default",
    is_required boolean DEFAULT false,
    CONSTRAINT questionnaire_question_pkey PRIMARY KEY (id),
    CONSTRAINT questionnaire_question_code_key UNIQUE (code)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.questionnaire_question
    OWNER to postgres;