-- Table: public.users

-- DROP TABLE IF EXISTS public.users;

CREATE TABLE IF NOT EXISTS public.users
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    username character varying(100) COLLATE pg_catalog."default" NOT NULL,
    password_hash character varying COLLATE pg_catalog."default" NOT NULL,
    email character varying COLLATE pg_catalog."default",
    "isActive" boolean NOT NULL DEFAULT true,
    "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
    role character varying COLLATE pg_catalog."default" NOT NULL DEFAULT 'user'::character varying,
    first_name character varying(100) COLLATE pg_catalog."default",
    last_name character varying(100) COLLATE pg_catalog."default",
    phone_number character varying(20) COLLATE pg_catalog."default",
    CONSTRAINT users_pkey PRIMARY KEY (id)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.users
    OWNER to postgres;
-- Index: IDX_fe0bb3f6520ee0469504521e71

-- DROP INDEX IF EXISTS public."IDX_fe0bb3f6520ee0469504521e71";

CREATE UNIQUE INDEX IF NOT EXISTS "IDX_fe0bb3f6520ee0469504521e71"
    ON public.users USING btree
    (username COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;