-- สคริปต์สำหรับสร้างฐานข้อมูล Kornpassorn Care
-- รันในลำดับ: 1. setup.sql → 2. tables.sql → 3. data.sql

-- =======================================
-- 1. ตั้งค่าฐานข้อมูล
-- =======================================

-- สร้างฐานข้อมูล (รันใน postgres database)
-- CREATE DATABASE kornpassorn_db;

-- เชื่อมต่อกับ kornpassorn_db แล้วรันต่อ
-- \c kornpassorn_db;

-- เปิดใช้ uuid extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =======================================
-- 2. สร้างตาราง Users
-- =======================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL,
    email VARCHAR,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    role VARCHAR DEFAULT 'user'
);

-- =======================================
-- 3. สร้างตาราง Patients
-- =======================================

CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    patient_code VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    gender VARCHAR(10),
    date_of_birth DATE,
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =======================================
-- 4. สร้างตาราง Medical Records
-- =======================================

CREATE TABLE IF NOT EXISTS medical_records (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    record_date DATE NOT NULL,
    chief_complaint TEXT,
    present_illness TEXT,
    past_medical_history TEXT,
    vital_signs TEXT,
    physical_examination TEXT,
    diagnosis TEXT,
    treatment_plan TEXT,
    medications TEXT,
    follow_up_instructions TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =======================================
-- 5. สร้างตาราง Questionnaire
-- =======================================

-- ตารางหลักสำหรับเก็บแบบสอบถามแต่ละชุด
CREATE TABLE IF NOT EXISTS patient_questionnaire (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(32) DEFAULT 'draft', -- draft, submitted, reviewed, etc.
    note TEXT
);

-- เก็บคำถามแต่ละข้อ (master)
CREATE TABLE IF NOT EXISTS questionnaire_question (
    id SERIAL PRIMARY KEY,
    code VARCHAR(64) UNIQUE NOT NULL,
    text TEXT NOT NULL,
    type VARCHAR(32) NOT NULL, -- เช่น 'text', 'choice', 'number', 'date'
    choices TEXT[],            -- ถ้าเป็น choice จะเก็บตัวเลือก
    is_required BOOLEAN DEFAULT false
);

-- เก็บคำตอบของแต่ละ patient questionnaire
CREATE TABLE IF NOT EXISTS patient_questionnaire_answer (
    id SERIAL PRIMARY KEY,
    questionnaire_id INTEGER NOT NULL REFERENCES patient_questionnaire(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questionnaire_question(id),
    answer_text TEXT,           -- เก็บคำตอบ (text/number/choice)
    answered_at TIMESTAMPTZ DEFAULT NOW()
);

-- =======================================
-- 6. สร้างตาราง User Tokens & Login Logs
-- =======================================

CREATE TABLE IF NOT EXISTS user_tokens (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_revoked BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS login_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    login_at TIMESTAMPTZ DEFAULT NOW(),
    success BOOLEAN DEFAULT true
);

-- =======================================
-- 7. สร้าง Indexes
-- =======================================

CREATE INDEX IF NOT EXISTS idx_patients_patient_code ON patients(patient_code);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_record_date ON medical_records(record_date);
CREATE INDEX IF NOT EXISTS idx_patient_questionnaire_patient_id ON patient_questionnaire(patient_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_answer_questionnaire_id ON patient_questionnaire_answer(questionnaire_id);
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON login_logs(user_id);

-- =======================================
-- 8. ข้อมูลเริ่มต้น
-- =======================================

-- สร้าง admin user (password: admin123)
INSERT INTO users (username, password_hash, email, role) 
VALUES ('admin', '$2b$10$nQnpq4KlmHq7f8/b0c0t5OBmngfWhz95EehO6rfRcu/x1LgZCsC4i', 'admin@kornpassorn.com', 'admin')
ON CONFLICT (username) DO NOTHING;

-- คำถามตัวอย่าง
INSERT INTO questionnaire_question (code, text, type, is_required) VALUES
('general_health', 'สุขภาพโดยรวมของท่านเป็นอย่างไร?', 'choice', true),
('chief_complaint', 'อาการหลักที่มาพบแพทย์วันนี้?', 'text', true),
('pain_scale', 'ระดับความเจ็บปวด (0-10)?', 'number', false),
('allergies', 'ท่านมีประวัติแพ้ยาหรือไม่?', 'choice', true)
ON CONFLICT (code) DO NOTHING;

-- ตัวเลือกคำตอบ
UPDATE questionnaire_question SET choices = ARRAY['ดีมาก', 'ดี', 'ปานกลาง', 'แย่', 'แย่มาก'] WHERE code = 'general_health';
UPDATE questionnaire_question SET choices = ARRAY['มี', 'ไม่มี', 'ไม่แน่ใจ'] WHERE code = 'allergies';

COMMIT;
