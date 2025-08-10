-- ===================================================================
-- Seeds สำหรับตาราง public.users
-- ===================================================================

-- เคลียร์ข้อมูลเก่า (ถ้ามี)
DELETE FROM public.users WHERE username IN (
    'admin', 'user_demo', 'doctor_01', 'nurse_01', 
    'api_demo_service', 'api_external_app', 'api_mobile_app'
);

-- ===================================================================
-- 1. ADMIN USERS
-- ===================================================================
INSERT INTO public.users (id, username, password_hash, email, "isActive", role, "createdAt")
VALUES 
(
    uuid_generate_v4(),
    'admin',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
    'admin@kornpassorn.com',
    true,
    'admin',
    NOW()
);

-- ===================================================================
-- 2. DOCTOR USERS
-- ===================================================================
INSERT INTO public.users (id, username, password_hash, email, "isActive", role, "createdAt")
VALUES 
(
    uuid_generate_v4(),
    'doctor_01',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
    'doctor01@kornpassorn.com',
    true,
    'doctor',
    NOW()
),
(
    uuid_generate_v4(),
    'doctor_02',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
    'doctor02@kornpassorn.com',
    true,
    'doctor',
    NOW()
);

-- ===================================================================
-- 3. NURSE USERS
-- ===================================================================
INSERT INTO public.users (id, username, password_hash, email, "isActive", role, "createdAt")
VALUES 
(
    uuid_generate_v4(),
    'nurse_01',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
    'nurse01@kornpassorn.com',
    true,
    'nurse',
    NOW()
),
(
    uuid_generate_v4(),
    'nurse_02',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
    'nurse02@kornpassorn.com',
    true,
    'nurse',
    NOW()
);

-- ===================================================================
-- 4. REGULAR USERS
-- ===================================================================
INSERT INTO public.users (id, username, password_hash, email, "isActive", role, "createdAt")
VALUES 
(
    uuid_generate_v4(),
    'user_demo',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
    'user@kornpassorn.com',
    true,
    'user',
    NOW()
),
(
    uuid_generate_v4(),
    'patient_01',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
    'patient01@kornpassorn.com',
    true,
    'patient',
    NOW()
);

-- ===================================================================
-- 5. API USERS (สำหรับ API Key Authentication)
-- ===================================================================
INSERT INTO public.users (id, username, password_hash, email, "isActive", role, "createdAt")
VALUES 
(
    uuid_generate_v4(),
    'api_demo_service',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- ไม่จำเป็นต้องใช้ password
    'api@kornpassorn.com',
    true,
    'api',
    NOW()
),
(
    uuid_generate_v4(),
    'api_external_app',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- ไม่จำเป็นต้องใช้ password
    'external@kornpassorn.com',
    true,
    'api',
    NOW()
),
(
    uuid_generate_v4(),
    'api_mobile_app',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- ไม่จำเป็นต้องใช้ password
    'mobile@kornpassorn.com',
    true,
    'api',
    NOW()
);

-- ===================================================================
-- 6. TEST USERS (สำหรับ Development)
-- ===================================================================
INSERT INTO public.users (id, username, password_hash, email, "isActive", role, "createdAt")
VALUES 
(
    uuid_generate_v4(),
    'test_inactive',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
    'test@kornpassorn.com',
    false, -- ไม่ active เพื่อทดสอบ
    'user',
    NOW()
);

-- ===================================================================
-- แสดงผลลัพธ์
-- ===================================================================
SELECT 
    username,
    role,
    "isActive",
    email,
    "createdAt"
FROM public.users 
ORDER BY role, username;

-- ===================================================================
-- ข้อมูล Login Credentials
-- ===================================================================
/*
📋 รายการ Login Credentials:

🔐 ADMIN:
- Username: admin
- Password: password
- Role: admin

👩‍⚕️ DOCTORS:
- Username: doctor_01, doctor_02
- Password: password
- Role: doctor

👩‍⚕️ NURSES:
- Username: nurse_01, nurse_02
- Password: password
- Role: nurse

👤 USERS:
- Username: user_demo, patient_01
- Password: password
- Role: user/patient

🔑 API KEYS (สำหรับ /auth/token):
- api_demo_service
- api_external_app
- api_mobile_app

⚠️ TEST:
- Username: test_inactive (isActive = false)
*/
