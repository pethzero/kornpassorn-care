-- ตารางหลักสำหรับเก็บแบบสอบถามแต่ละชุด
CREATE TABLE patient_questionnaire (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patient(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(32) DEFAULT 'draft', -- draft, submitted, reviewed, etc.
    note TEXT
);

-- เก็บคำถามแต่ละข้อ (master)
CREATE TABLE questionnaire_question (
    id SERIAL PRIMARY KEY,
    code VARCHAR(64) UNIQUE NOT NULL,
    text TEXT NOT NULL,
    type VARCHAR(32) NOT NULL, -- เช่น 'text', 'choice', 'number', 'date'
    choices TEXT[],            -- ถ้าเป็น choice จะเก็บตัวเลือก
    is_required BOOLEAN DEFAULT false
);

-- เก็บคำตอบของแต่ละ patient questionnaire
CREATE TABLE patient_questionnaire_answer (
    id SERIAL PRIMARY KEY,
    questionnaire_id INTEGER NOT NULL REFERENCES patient_questionnaire(id),
    question_id INTEGER NOT NULL REFERENCES questionnaire_question(id),
    answer_text TEXT,           -- เก็บคำตอบ (text/number/choice)
    answered_at TIMESTAMP DEFAULT NOW()
);