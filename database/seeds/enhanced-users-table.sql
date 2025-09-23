-- Enhanced Users Table
-- DROP TABLE IF EXISTS public.users CASCADE;

CREATE TABLE IF NOT EXISTS public.users
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    username character varying(100) COLLATE pg_catalog."default" NOT NULL,
    password_hash character varying COLLATE pg_catalog."default" NOT NULL,
    email character varying(255) COLLATE pg_catalog."default",
    "isActive" boolean NOT NULL DEFAULT true,
    "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
    "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    role character varying(50) COLLATE pg_catalog."default" NOT NULL DEFAULT 'user'::character varying,
    
    -- เพิ่มฟิลด์เสริม
    first_name character varying(100) COLLATE pg_catalog."default",
    last_name character varying(100) COLLATE pg_catalog."default",
    phone_number character varying(20) COLLATE pg_catalog."default",
    profile_picture_url character varying(500) COLLATE pg_catalog."default",
    
    -- Security และ tracking fields
    email_verified boolean NOT NULL DEFAULT false,
    email_verification_token character varying(255),
    password_reset_token character varying(255),
    password_reset_expires timestamp with time zone,
    last_login_at timestamp with time zone,
    login_attempts integer NOT NULL DEFAULT 0,
    locked_until timestamp with time zone,
    
    -- API related fields
    api_key character varying(255),
    api_key_created_at timestamp with time zone,
    api_rate_limit integer DEFAULT 1000, -- requests per hour
    
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_username_key UNIQUE (username),
    CONSTRAINT users_email_key UNIQUE (email),
    CONSTRAINT users_api_key_key UNIQUE (api_key),
    CONSTRAINT check_role CHECK (role IN ('user', 'admin', 'api', 'guest')),
    CONSTRAINT check_login_attempts CHECK (login_attempts >= 0)
)
TABLESPACE pg_default;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON public.users("isActive");
CREATE INDEX IF NOT EXISTS idx_users_last_login ON public.users(last_login_at);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE IF EXISTS public.users OWNER to postgres;
