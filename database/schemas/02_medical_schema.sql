-- =======================================
-- Medical Schema - ระบบจัดการคลินิก
-- =======================================

SET search_path TO medical, public;

-- ตาราง Patients (ผู้ป่วย)
CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    patient_code VARCHAR(20) UNIQUE NOT NULL,
    id_card VARCHAR(13) UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    nickname VARCHAR(50),
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    date_of_birth DATE,
    age INTEGER,
    nationality VARCHAR(50) DEFAULT 'ไทย',
    religion VARCHAR(50),
    occupation VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    line_id VARCHAR(100),
    address TEXT,
    district VARCHAR(100),
    province VARCHAR(100),
    postal_code VARCHAR(10),
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relation VARCHAR(50),
    blood_type VARCHAR(5),
    allergies TEXT,
    chronic_diseases TEXT,
    current_medications TEXT,
    insurance_type VARCHAR(50),
    insurance_number VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- ตาราง Appointments (นัดหมาย)
CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    doctor_id UUID REFERENCES auth.users(id),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    type VARCHAR(50) DEFAULT 'consultation',
    status VARCHAR(20) DEFAULT 'scheduled',
    chief_complaint TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT appointments_status_check CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
    CONSTRAINT appointments_type_check CHECK (type IN ('consultation', 'follow_up', 'emergency', 'checkup', 'procedure'))
);

-- ตาราง Medical Records (บันทึกการรักษา)
CREATE TABLE IF NOT EXISTS medical_records (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    appointment_id INTEGER REFERENCES appointments(id),
    visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    visit_time TIME DEFAULT CURRENT_TIME,
    chief_complaint TEXT,
    present_illness TEXT,
    past_medical_history TEXT,
    family_history TEXT,
    social_history TEXT,
    review_of_systems TEXT,
    vital_signs JSONB,
    physical_examination TEXT,
    assessment TEXT,
    plan TEXT,
    diagnosis_primary TEXT,
    diagnosis_secondary TEXT[],
    icd10_codes TEXT[],
    follow_up_date DATE,
    follow_up_instructions TEXT,
    doctor_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ตาราง Prescriptions (ใบสั่งยา)
CREATE TABLE IF NOT EXISTS prescriptions (
    id SERIAL PRIMARY KEY,
    medical_record_id INTEGER NOT NULL REFERENCES medical_records(id),
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    doctor_id UUID NOT NULL REFERENCES auth.users(id),
    prescription_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT prescriptions_status_check CHECK (status IN ('active', 'completed', 'cancelled'))
);

-- ตาราง Prescription Items (รายการยา)
CREATE TABLE IF NOT EXISTS prescription_items (
    id SERIAL PRIMARY KEY,
    prescription_id INTEGER NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    medication_name VARCHAR(200) NOT NULL,
    generic_name VARCHAR(200),
    strength VARCHAR(50),
    dosage_form VARCHAR(50),
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20),
    directions_for_use TEXT,
    frequency VARCHAR(100),
    duration_days INTEGER,
    price_per_unit DECIMAL(10,2),
    total_price DECIMAL(10,2),
    notes TEXT
);

-- ตาราง Lab Tests (การตรวจแล็บ)
CREATE TABLE IF NOT EXISTS lab_tests (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    medical_record_id INTEGER REFERENCES medical_records(id),
    test_name VARCHAR(200) NOT NULL,
    test_code VARCHAR(50),
    ordered_date DATE NOT NULL DEFAULT CURRENT_DATE,
    sample_date DATE,
    result_date DATE,
    status VARCHAR(20) DEFAULT 'ordered',
    results JSONB,
    normal_range VARCHAR(100),
    interpretation TEXT,
    doctor_id UUID REFERENCES auth.users(id),
    lab_technician VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT lab_tests_status_check CHECK (status IN ('ordered', 'collected', 'processing', 'completed', 'cancelled'))
);

-- สร้าง Indexes
CREATE INDEX IF NOT EXISTS idx_patients_patient_code ON patients(patient_code);
CREATE INDEX IF NOT EXISTS idx_patients_id_card ON patients(id_card);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_visit_date ON medical_records(visit_date);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription_id ON prescription_items(prescription_id);
CREATE INDEX IF NOT EXISTS idx_lab_tests_patient_id ON lab_tests(patient_id);

-- Comments
COMMENT ON TABLE patients IS 'ตารางข้อมูลผู้ป่วย';
COMMENT ON TABLE appointments IS 'ตารางการนัดหมาย';
COMMENT ON TABLE medical_records IS 'ตารางบันทึกการรักษา';
COMMENT ON TABLE prescriptions IS 'ตารางใบสั่งยา';
COMMENT ON TABLE prescription_items IS 'ตารางรายการยาในใบสั่งยา';
COMMENT ON TABLE lab_tests IS 'ตารางการตรวจแล็บ';
