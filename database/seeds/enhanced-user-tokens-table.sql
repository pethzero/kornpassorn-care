-- Enhanced User Tokens Table
-- DROP TABLE IF EXISTS public.user_tokens CASCADE;

CREATE TABLE IF NOT EXISTS public.user_tokens
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    token character varying(1000) COLLATE pg_catalog."default" NOT NULL,
    token_type character varying(50) NOT NULL DEFAULT 'access'::character varying, -- access, refresh, email_verification, password_reset
    expired_at timestamp with time zone NOT NULL,
    revoked boolean NOT NULL DEFAULT false,
    revoked_at timestamp with time zone,
    revoked_reason character varying(255),
    
    -- User และ session tracking
    "userId" uuid NOT NULL,
    device_info jsonb, -- เก็บข้อมูล device, browser, OS
    ip_address inet,
    user_agent text,
    
    -- Timestamps
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    last_used_at timestamp with time zone,
    
    CONSTRAINT user_tokens_pkey PRIMARY KEY (id),
    CONSTRAINT user_tokens_token_key UNIQUE (token),
    CONSTRAINT "FK_user_tokens_userId" FOREIGN KEY ("userId")
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT check_token_type CHECK (token_type IN ('access', 'refresh', 'email_verification', 'password_reset', 'api'))
)
TABLESPACE pg_default;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON public.user_tokens("userId");
CREATE INDEX IF NOT EXISTS idx_user_tokens_token_type ON public.user_tokens(token_type);
CREATE INDEX IF NOT EXISTS idx_user_tokens_expired_at ON public.user_tokens(expired_at);
CREATE INDEX IF NOT EXISTS idx_user_tokens_revoked ON public.user_tokens(revoked);
CREATE INDEX IF NOT EXISTS idx_user_tokens_active ON public.user_tokens("userId", revoked, expired_at) WHERE revoked = false;

-- Auto-cleanup expired tokens (optional)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM public.user_tokens 
    WHERE expired_at < now() - INTERVAL '7 days'; -- Keep for 7 days after expiry for audit
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-expired-tokens', '0 2 * * *', 'SELECT cleanup_expired_tokens();');

ALTER TABLE IF EXISTS public.user_tokens OWNER to postgres;
