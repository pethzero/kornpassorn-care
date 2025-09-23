-- Additional Security and Audit Tables

-- 1. Login Logs Table (รายละเอียดการ login)
CREATE TABLE IF NOT EXISTS public.login_logs
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    "userId" uuid,
    username character varying(100),
    ip_address inet,
    user_agent text,
    success boolean NOT NULL,
    fail_reason character varying(255),
    login_method character varying(50) DEFAULT 'password', -- password, api_key, oauth, guest
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    
    CONSTRAINT login_logs_pkey PRIMARY KEY (id),
    CONSTRAINT "FK_login_logs_userId" FOREIGN KEY ("userId")
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON public.login_logs("userId");
CREATE INDEX IF NOT EXISTS idx_login_logs_success ON public.login_logs(success);
CREATE INDEX IF NOT EXISTS idx_login_logs_created_at ON public.login_logs(created_at);

-- 2. User Preferences Table
CREATE TABLE IF NOT EXISTS public.user_preferences
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    "userId" uuid NOT NULL,
    preference_key character varying(100) NOT NULL,
    preference_value jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    
    CONSTRAINT user_preferences_pkey PRIMARY KEY (id),
    CONSTRAINT user_preferences_unique UNIQUE ("userId", preference_key),
    CONSTRAINT "FK_user_preferences_userId" FOREIGN KEY ("userId")
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- 3. User Roles และ Permissions (สำหรับ RBAC ที่ซับซ้อน)
CREATE TABLE IF NOT EXISTS public.roles
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    role_name character varying(50) NOT NULL,
    description text,
    permissions jsonb, -- เก็บ permissions เป็น JSON array
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    
    CONSTRAINT roles_pkey PRIMARY KEY (id),
    CONSTRAINT roles_name_unique UNIQUE (role_name)
);

-- 4. API Usage Logs (สำหรับติดตาม API usage)
CREATE TABLE IF NOT EXISTS public.api_usage_logs
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    "userId" uuid,
    endpoint character varying(255) NOT NULL,
    method character varying(10) NOT NULL,
    status_code integer,
    response_time_ms integer,
    ip_address inet,
    user_agent text,
    request_size_bytes integer,
    response_size_bytes integer,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    
    CONSTRAINT api_usage_logs_pkey PRIMARY KEY (id),
    CONSTRAINT "FK_api_usage_logs_userId" FOREIGN KEY ("userId")
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_id ON public.api_usage_logs("userId");
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_endpoint ON public.api_usage_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON public.api_usage_logs(created_at);

-- 5. Security Events Table
CREATE TABLE IF NOT EXISTS public.security_events
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    "userId" uuid,
    event_type character varying(100) NOT NULL, -- failed_login, password_change, suspicious_activity
    event_data jsonb,
    ip_address inet,
    user_agent text,
    severity character varying(20) DEFAULT 'info', -- info, warning, critical
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    
    CONSTRAINT security_events_pkey PRIMARY KEY (id),
    CONSTRAINT "FK_security_events_userId" FOREIGN KEY ("userId")
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT check_severity CHECK (severity IN ('info', 'warning', 'critical'))
);

ALTER TABLE IF EXISTS public.login_logs OWNER to postgres;
ALTER TABLE IF EXISTS public.user_preferences OWNER to postgres;
ALTER TABLE IF EXISTS public.roles OWNER to postgres;
ALTER TABLE IF EXISTS public.api_usage_logs OWNER to postgres;
ALTER TABLE IF EXISTS public.security_events OWNER to postgres;
