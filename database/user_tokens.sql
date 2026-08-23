-- Table: public.user_tokens

-- DROP TABLE IF EXISTS public.user_tokens;

CREATE TABLE IF NOT EXISTS public.user_tokens
(
    expired_at timestamp without time zone,
    revoked boolean NOT NULL DEFAULT false,
    "userId" uuid,
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    jti uuid,
    token_hash character varying COLLATE pg_catalog."default",
    token_type character varying COLLATE pg_catalog."default" NOT NULL DEFAULT 'access'::character varying,
    last_used timestamp without time zone,
    is_permanent boolean NOT NULL DEFAULT false,
    device_info jsonb,
    device_ip inet,
    revoked_by uuid,
    revoked_at timestamp without time zone,
    revoked_reason text COLLATE pg_catalog."default",
    CONSTRAINT "PK_63764db9d9aaa4af33e07b2f4bf" PRIMARY KEY (id),
    CONSTRAINT "FK_92ce9a299624e4c4ffd99b645b6" FOREIGN KEY ("userId")
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.user_tokens
    OWNER to postgres;
-- Index: IDX_077c7728aeb1dec1b6cce972d1

-- DROP INDEX IF EXISTS public."IDX_077c7728aeb1dec1b6cce972d1";

CREATE INDEX IF NOT EXISTS "IDX_077c7728aeb1dec1b6cce972d1"
    ON public.user_tokens USING btree
    (revoked ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: IDX_92ce9a299624e4c4ffd99b645b

-- DROP INDEX IF EXISTS public."IDX_92ce9a299624e4c4ffd99b645b";

CREATE INDEX IF NOT EXISTS "IDX_92ce9a299624e4c4ffd99b645b"
    ON public.user_tokens USING btree
    ("userId" ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: IDX_cf8bff5dc33a46985bf6b2071e

-- DROP INDEX IF EXISTS public."IDX_cf8bff5dc33a46985bf6b2071e";

CREATE INDEX IF NOT EXISTS "IDX_cf8bff5dc33a46985bf6b2071e"
    ON public.user_tokens USING btree
    (jti ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: IDX_ebdd918653813b59cdd5d379b5

-- DROP INDEX IF EXISTS public."IDX_ebdd918653813b59cdd5d379b5";

CREATE INDEX IF NOT EXISTS "IDX_ebdd918653813b59cdd5d379b5"
    ON public.user_tokens USING btree
    (token_hash COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;