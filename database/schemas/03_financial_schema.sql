-- =======================================
-- Financial Schema - ระบบการเงิน รายรับรายจ่าย
-- =======================================

SET search_path TO financial, public;

-- ตาราง Chart of Accounts (ผังบัญชี)
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id SERIAL PRIMARY KEY,
    account_code VARCHAR(20) UNIQUE NOT NULL,
    account_name VARCHAR(200) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    parent_account_id INTEGER REFERENCES chart_of_accounts(id),
    level INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT account_type_check CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense'))
);

-- ตาราง Service Categories (หมวดหมู่บริการ)
CREATE TABLE IF NOT EXISTS service_categories (
    id SERIAL PRIMARY KEY,
    category_code VARCHAR(20) UNIQUE NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ตาราง Services (บริการและราคา)
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    service_code VARCHAR(50) UNIQUE NOT NULL,
    service_name VARCHAR(200) NOT NULL,
    category_id INTEGER REFERENCES service_categories(id),
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    cost DECIMAL(10,2) DEFAULT 0,
    unit VARCHAR(20) DEFAULT 'ครั้ง',
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ตาราง Invoices (ใบแจ้งหนี้)
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    patient_id INTEGER REFERENCES medical.patients(id),
    medical_record_id INTEGER REFERENCES medical.medical_records(id),
    appointment_id INTEGER REFERENCES medical.appointments(id),
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    balance DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    payment_terms VARCHAR(50),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT invoice_status_check CHECK (status IN ('draft', 'pending', 'paid', 'partial', 'overdue', 'cancelled'))
);

-- ตาราง Invoice Items (รายการในใบแจ้งหนี้)
CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES services(id),
    item_type VARCHAR(50) DEFAULT 'service',
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    
    CONSTRAINT item_type_check CHECK (item_type IN ('service', 'medication', 'lab_test', 'procedure', 'other'))
);

-- ตาราง Payments (การชำระเงิน)
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_id INTEGER REFERENCES invoices(id),
    patient_id INTEGER REFERENCES medical.patients(id),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_time TIME DEFAULT CURRENT_TIME,
    amount DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    reference_number VARCHAR(100),
    bank_name VARCHAR(100),
    card_type VARCHAR(50),
    notes TEXT,
    received_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT payment_method_check CHECK (payment_method IN ('cash', 'credit_card', 'debit_card', 'bank_transfer', 'qr_payment', 'insurance', 'check'))
);

-- ตาราง Expenses (ค่าใช้จ่าย)
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    expense_number VARCHAR(50) UNIQUE NOT NULL,
    account_id INTEGER REFERENCES chart_of_accounts(id),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    vendor_name VARCHAR(200),
    vendor_tax_id VARCHAR(20),
    description TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(50),
    reference_number VARCHAR(100),
    receipt_number VARCHAR(100),
    category VARCHAR(100),
    department VARCHAR(100),
    approved_by UUID REFERENCES auth.users(id),
    paid_by UUID REFERENCES auth.users(id),
    status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT expense_status_check CHECK (status IN ('draft', 'pending', 'approved', 'paid', 'rejected'))
);

-- ตาราง Cash Flow (กระแสเงินสด)
CREATE TABLE IF NOT EXISTS cash_flow (
    id SERIAL PRIMARY KEY,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_time TIME DEFAULT CURRENT_TIME,
    type VARCHAR(10) NOT NULL,
    category VARCHAR(100),
    amount DECIMAL(12,2) NOT NULL,
    balance_before DECIMAL(12,2),
    balance_after DECIMAL(12,2),
    description TEXT,
    reference_type VARCHAR(50),
    reference_id INTEGER,
    account_id INTEGER REFERENCES chart_of_accounts(id),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT cash_flow_type_check CHECK (type IN ('income', 'expense'))
);

-- ตาราง Daily Summary (สรุปรายวัน)
CREATE TABLE IF NOT EXISTS daily_summary (
    id SERIAL PRIMARY KEY,
    summary_date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
    total_income DECIMAL(12,2) DEFAULT 0,
    total_expense DECIMAL(12,2) DEFAULT 0,
    net_income DECIMAL(12,2) DEFAULT 0,
    cash_income DECIMAL(12,2) DEFAULT 0,
    card_income DECIMAL(12,2) DEFAULT 0,
    transfer_income DECIMAL(12,2) DEFAULT 0,
    patient_count INTEGER DEFAULT 0,
    invoice_count INTEGER DEFAULT 0,
    opening_balance DECIMAL(12,2) DEFAULT 0,
    closing_balance DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- สร้าง Indexes
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_code ON chart_of_accounts(account_code);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_type ON chart_of_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_services_code ON services(service_code);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_patient_id ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_account_id ON expenses(account_id);
CREATE INDEX IF NOT EXISTS idx_cash_flow_date ON cash_flow(transaction_date);
CREATE INDEX IF NOT EXISTS idx_cash_flow_type ON cash_flow(type);
CREATE INDEX IF NOT EXISTS idx_daily_summary_date ON daily_summary(summary_date);

-- Comments
COMMENT ON TABLE chart_of_accounts IS 'ตารางผังบัญชี';
COMMENT ON TABLE service_categories IS 'ตารางหมวดหมู่บริการ';
COMMENT ON TABLE services IS 'ตารางบริการและราคา';
COMMENT ON TABLE invoices IS 'ตารางใบแจ้งหนี้';
COMMENT ON TABLE invoice_items IS 'ตารางรายการในใบแจ้งหนี้';
COMMENT ON TABLE payments IS 'ตารางการชำระเงิน';
COMMENT ON TABLE expenses IS 'ตารางค่าใช้จ่าย';
COMMENT ON TABLE cash_flow IS 'ตารางกระแสเงินสด';
COMMENT ON TABLE daily_summary IS 'ตารางสรุปรายวัน';
