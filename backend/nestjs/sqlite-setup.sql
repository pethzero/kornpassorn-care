-- SQLite Setup Script สำหรับ Kornpassorn Care
-- ไฟล์นี้จะถูกรันอัตโนมัติเมื่อใช้ SQLite

-- =======================================
-- สร้างตาราง Users
-- =======================================

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT,
    isActive INTEGER DEFAULT 1,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    role TEXT DEFAULT 'user'
);

-- =======================================
-- สร้างตาราง Patients
-- =======================================

CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_code TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    gender TEXT,
    date_of_birth DATE,
    phone TEXT,
    email TEXT,
    address TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =======================================
-- สร้างตาราง Medical Records
-- =======================================

CREATE TABLE IF NOT EXISTS medical_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
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
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id)
);

-- =======================================
-- สร้างตาราง Questionnaire
-- =======================================

CREATE TABLE IF NOT EXISTS patient_questionnaire (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'draft',
    note TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE TABLE IF NOT EXISTS questionnaire_question (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    text TEXT NOT NULL,
    type TEXT NOT NULL,
    choices TEXT, -- JSON string for SQLite
    is_required INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS patient_questionnaire_answer (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    questionnaire_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    answer_text TEXT,
    answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (questionnaire_id) REFERENCES patient_questionnaire(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questionnaire_question(id)
);

-- =======================================
-- สร้างตาราง User Tokens & Login Logs
-- =======================================

CREATE TABLE IF NOT EXISTS user_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_revoked INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS login_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    login_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    success INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =======================================
-- สร้าง Indexes
-- =======================================

CREATE INDEX IF NOT EXISTS idx_patients_patient_code ON patients(patient_code);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_record_date ON medical_records(record_date);
CREATE INDEX IF NOT EXISTS idx_patient_questionnaire_patient_id ON patient_questionnaire(patient_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_answer_questionnaire_id ON patient_questionnaire_answer(questionnaire_id);
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON login_logs(user_id);

-- =======================================
-- ข้อมูลเริ่มต้น
-- =======================================

-- สร้าง admin user (password: admin123)
INSERT OR IGNORE INTO users (id, username, password_hash, email, role) 
VALUES ('admin-uuid-123', 'admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin@kornpassorn.com', 'admin');

-- คำถามตัวอย่าง
INSERT OR IGNORE INTO questionnaire_question (code, text, type, is_required, choices) VALUES
('general_health', 'สุขภาพโดยรวมของท่านเป็นอย่างไร?', 'choice', 1, '["ดีมาก", "ดี", "ปานกลาง", "แย่", "แย่มาก"]'),
('chief_complaint', 'อาการหลักที่มาพบแพทย์วันนี้?', 'text', 1, NULL),
('pain_scale', 'ระดับความเจ็บปวด (0-10)?', 'number', 0, NULL),
('allergies', 'ท่านมีประวัติแพ้ยาหรือไม่?', 'choice', 1, '["มี", "ไม่มี", "ไม่แน่ใจ"]');
