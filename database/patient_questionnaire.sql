-- Table: public.patient_questionnaire

-- DROP TABLE IF EXISTS public.patient_questionnaire;

CREATE TABLE IF NOT EXISTS public.patient_questionnaire
(
    id integer NOT NULL DEFAULT nextval('patient_questionnaire_id_seq'::regclass),
    patient_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    status character varying(32) COLLATE pg_catalog."default" DEFAULT 'draft'::character varying,
    note text COLLATE pg_catalog."default",
    CONSTRAINT patient_questionnaire_pkey PRIMARY KEY (id),
    CONSTRAINT patient_questionnaire_patient_id_fkey FOREIGN KEY (patient_id)
        REFERENCES public.patients (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.patient_questionnaire
    OWNER to postgres;
-- Index: idx_patient_questionnaire_patient_id

-- DROP INDEX IF EXISTS public.idx_patient_questionnaire_patient_id;

CREATE INDEX IF NOT EXISTS idx_patient_questionnaire_patient_id
    ON public.patient_questionnaire USING btree
    (patient_id ASC NULLS LAST)
    TABLESPACE pg_default;