-- Table: public.medical_records

-- DROP TABLE IF EXISTS public.medical_records;

CREATE TABLE IF NOT EXISTS public.medical_records
(
    id integer NOT NULL DEFAULT nextval('medical_records_id_seq'::regclass),
    patient_id integer NOT NULL,
    diagnosis text COLLATE pg_catalog."default",
    visit_date timestamp without time zone NOT NULL,
    symptoms text COLLATE pg_catalog."default",
    treatment text COLLATE pg_catalog."default",
    doctor_name character varying(100) COLLATE pg_catalog."default",
    note text COLLATE pg_catalog."default",
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    CONSTRAINT medical_records_pkey PRIMARY KEY (id),
    CONSTRAINT "FK_43e2800e756c913a6c7a07cc271" FOREIGN KEY (patient_id)
        REFERENCES public.patients (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.medical_records
    OWNER to postgres;