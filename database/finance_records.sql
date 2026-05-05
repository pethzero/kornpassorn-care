-- Table: public.finance_records

-- DROP TABLE IF EXISTS public.finance_records;

CREATE TABLE IF NOT EXISTS public.finance_records
(
    id integer NOT NULL DEFAULT nextval('finance_records_id_seq'::regclass),
    item_name character varying(255) COLLATE pg_catalog."default" NOT NULL,
    category character varying(20) COLLATE pg_catalog."default" NOT NULL,
    amount numeric(12,2) NOT NULL,
    record_date date NOT NULL,
    create_by character varying(50) COLLATE pg_catalog."default" DEFAULT 'system'::character varying,
    create_date timestamp without time zone NOT NULL DEFAULT now(),
    modify_by character varying(50) COLLATE pg_catalog."default",
    modify_date timestamp without time zone DEFAULT now(),
    description character varying(500) COLLATE pg_catalog."default",
    CONSTRAINT finance_records_pkey PRIMARY KEY (id)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.finance_records
    OWNER to postgres;