-- =======================================
-- Audit Schema - ระบบติดตามการเปลี่ยนแปลงข้อมูล
-- =======================================

SET search_path TO audit, public;

-- ตาราง Audit Log (บันทึกการเปลี่ยนแปลง)
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(100) NOT NULL,
    action VARCHAR(10) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    user_id UUID REFERENCES auth.users(id),
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT audit_action_check CHECK (action IN ('INSERT', 'UPDATE', 'DELETE'))
);

-- ตาราง System Events (เหตุการณ์ระบบ)
CREATE TABLE IF NOT EXISTS system_events (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    event_category VARCHAR(50),
    description TEXT,
    severity VARCHAR(20) DEFAULT 'info',
    user_id UUID REFERENCES auth.users(id),
    ip_address INET,
    data JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT severity_check CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical'))
);

-- ตาราง Backup Log (บันทึกการสำรองข้อมูล)
CREATE TABLE IF NOT EXISTS backup_log (
    id SERIAL PRIMARY KEY,
    backup_type VARCHAR(50) NOT NULL,
    backup_name VARCHAR(255) NOT NULL,
    file_path TEXT,
    file_size BIGINT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER,
    status VARCHAR(20),
    error_message TEXT,
    created_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT backup_status_check CHECK (status IN ('started', 'completed', 'failed', 'cancelled'))
);

-- สร้าง Indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_system_events_type ON system_events(event_type);
CREATE INDEX IF NOT EXISTS idx_system_events_timestamp ON system_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_backup_log_status ON backup_log(status);

-- Comments
COMMENT ON TABLE audit_log IS 'ตารางบันทึกการเปลี่ยนแปลงข้อมูล';
COMMENT ON TABLE system_events IS 'ตารางเหตุการณ์ระบบ';
COMMENT ON TABLE backup_log IS 'ตารางบันทึกการสำรองข้อมูล';
