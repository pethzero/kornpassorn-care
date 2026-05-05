-- Table: public.login_logs

-- DROP TABLE IF EXISTS public.login_logs;

CREATE TABLE IF NOT EXISTS public.login_logs
(
    id integer NOT NULL DEFAULT nextval('login_logs_id_seq'::regclass),
    user_id uuid,
    user_agent text COLLATE pg_catalog."default",
    success boolean NOT NULL DEFAULT false,
    login_time timestamp without time zone NOT NULL DEFAULT now(),
    fail_reason text COLLATE pg_catalog."default",
    ip_address character varying(45) COLLATE pg_catalog."default",
    CONSTRAINT login_logs_pkey PRIMARY KEY (id),
    CONSTRAINT "FK_e2dffa109d0d3dbd94a0a51669c" FOREIGN KEY (user_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.login_logs
    OWNER to postgres;