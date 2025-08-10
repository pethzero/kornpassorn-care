# 🗃️ Kornpassorn Care Database Documentation

## 📋 **Database Overview**

ระบบฐานข้อมูลสำหรับคลินิก Kornpassorn Care ประกอบด้วย 4 schemas หลัก:

### **🔐 Auth Schema** - การจัดการผู้ใช้
- `users` - ข้อมูลผู้ใช้ระบบ
- `user_sessions` - การเข้าสู่ระบบ
- `login_logs` - บันทึกการ login
- `user_permissions` - สิทธิ์ผู้ใช้

### **🏥 Medical Schema** - ระบบคลินิก
- `patients` - ข้อมูลผู้ป่วย
- `appointments` - การนัดหมาย
- `medical_records` - บันทึกการรักษา
- `prescriptions` - ใบสั่งยา
- `prescription_items` - รายการยาในใบสั่งยา
- `lab_tests` - การตรวจแล็บ

### **💰 Financial Schema** - ระบบรายรับรายจ่าย
- `chart_of_accounts` - ผังบัญชี
- `service_categories` - หมวดหมู่บริการ
- `services` - บริการและราคา
- `invoices` - ใบแจ้งหนี้
- `invoice_items` - รายการในใบแจ้งหนี้
- `payments` - การชำระเงิน
- `expenses` - ค่าใช้จ่าย
- `cash_flow` - กระแสเงินสด
- `daily_summary` - สรุปรายวัน

### **📊 Audit Schema** - ระบบติดตาม
- `audit_log` - บันทึกการเปลี่ยนแปลง
- `system_events` - เหตุการณ์ระบบ
- `backup_log` - บันทึกการสำรองข้อมูล

## 🚀 **การติดตั้ง**

### **Windows:**
```cmd
cd database
scripts\setup.bat
```

### **Linux/Mac:**
```bash
cd database
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### **Manual Setup:**
```sql
-- 1. สร้างฐานข้อมูล
psql -U postgres -f setup.sql

-- 2. สร้าง schemas
psql -U postgres -d kornpassorn_db -f schemas/01_auth_schema.sql
psql -U postgres -d kornpassorn_db -f schemas/02_medical_schema.sql
psql -U postgres -d kornpassorn_db -f schemas/03_financial_schema.sql
psql -U postgres -d kornpassorn_db -f schemas/04_audit_schema.sql

-- 3. เพิ่มข้อมูลเริ่มต้น
psql -U postgres -d kornpassorn_db -f seeds/initial_data.sql

-- 4. สร้าง Views (ถ้าต้องการ)
psql -U postgres -d kornpassorn_db -f scripts/financial_views.sql
```

## 👤 **Default Users**

| Username | Password | Role | Description |
|----------|----------|------|-------------|
| admin | admin123 | admin | ผู้ดูแลระบบ |
| doctor1 | admin123 | doctor | แพทย์ |
| nurse1 | admin123 | nurse | พยาบาล |
| accountant1 | admin123 | accountant | นักบัญชี |

## 💰 **Financial System Usage**

### **การบันทึกรายได้:**

```sql
-- 1. สร้างใบแจ้งหนี้
INSERT INTO financial.invoices (invoice_number, patient_id, total_amount, status) 
VALUES ('INV-001', 1, 500.00, 'pending');

-- 2. เพิ่มรายการในใบแจ้งหนี้
INSERT INTO financial.invoice_items (invoice_id, service_id, description, quantity, unit_price, total_amount)
VALUES (1, 1, 'ค่าตรวจรักษาทั่วไป', 1, 500.00, 500.00);

-- 3. บันทึกการชำระเงิน
INSERT INTO financial.payments (payment_number, invoice_id, amount, payment_method)
VALUES ('PAY-001', 1, 500.00, 'cash');

-- 4. อัปเดตสถานะใบแจ้งหนี้
UPDATE financial.invoices SET status = 'paid', paid_amount = 500.00, balance = 0 WHERE id = 1;
```

### **การบันทึกรายจ่าย:**

```sql
-- บันทึกค่าใช้จ่าย
INSERT INTO financial.expenses (expense_number, description, amount, total_amount, expense_date, category, payment_method)
VALUES ('EXP-001', 'ค่าไฟฟ้าเดือนมกราคม', 2000.00, 2000.00, CURRENT_DATE, 'ค่าไฟฟ้า', 'bank_transfer');
```

### **รายงานการเงิน:**

```sql
-- รายได้รายวัน
SELECT * FROM financial.daily_income_report WHERE payment_date = CURRENT_DATE;

-- รายจ่ายรายวัน
SELECT * FROM financial.daily_expense_report WHERE expense_date = CURRENT_DATE;

-- กำไรขาดทุนรายวัน
SELECT * FROM financial.daily_profit_loss WHERE report_date = CURRENT_DATE;

-- ยอดขายรายเดือน
SELECT * FROM financial.monthly_summary WHERE month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM');

-- ลูกหนี้ค้างชำระ
SELECT * FROM financial.outstanding_invoices;
```

## 🏥 **Medical System Usage**

### **การลงทะเบียนผู้ป่วย:**

```sql
INSERT INTO medical.patients (patient_code, first_name, last_name, gender, date_of_birth, phone)
VALUES ('P001', 'สมชาย', 'ใจดี', 'male', '1980-01-01', '0812345678');
```

### **การนัดหมาย:**

```sql
INSERT INTO medical.appointments (patient_id, appointment_date, appointment_time, type, chief_complaint)
VALUES (1, '2025-08-10', '10:00:00', 'consultation', 'ปวดหัว');
```

### **การบันทึกการรักษา:**

```sql
INSERT INTO medical.medical_records (patient_id, visit_date, chief_complaint, diagnosis_primary, treatment_plan)
VALUES (1, CURRENT_DATE, 'ปวดหัด', 'Tension headache', 'พักผ่อน ดื่มน้ำเยอะๆ');
```

## 🔧 **Maintenance**

### **การสำรองข้อมูล:**
```bash
pg_dump -U postgres kornpassorn_db > backup_$(date +%Y%m%d).sql
```

### **การ Restore:**
```bash
psql -U postgres -d kornpassorn_db < backup_20250810.sql
```

### **การตรวจสอบสถานะระบบ:**
```sql
-- ตรวจสอบจำนวนข้อมูล
SELECT 
    'patients' as table_name, COUNT(*) as record_count FROM medical.patients
UNION ALL
SELECT 'invoices', COUNT(*) FROM financial.invoices
UNION ALL
SELECT 'payments', COUNT(*) FROM financial.payments;
```

## 📊 **Performance Monitoring**

### **การตรวจสอบ Performance:**
```sql
-- ตรวจสอบ slow queries
SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;

-- ตรวจสอบขนาดตาราง
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables WHERE schemaname IN ('auth', 'medical', 'financial', 'audit')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 🔗 **Connection String Examples**

### **Development:**
```
postgresql://postgres:123456@localhost:5432/kornpassorn_db
```

### **Production:**
```
postgresql://username:password@host:port/kornpassorn_db_prod
```

## 📞 **Support**

สำหรับการสนับสนุนเพิ่มเติม กรุณาติดต่อทีมพัฒนา
