-- =======================================
-- Financial Reports Views
-- Views สำหรับรายงานทางการเงิน
-- =======================================

-- View: รายได้รายวัน
CREATE OR REPLACE VIEW financial.daily_income_report AS
SELECT 
    p.payment_date,
    COUNT(DISTINCT i.patient_id) as patient_count,
    COUNT(DISTINCT i.id) as invoice_count,
    SUM(p.amount) as total_income,
    SUM(CASE WHEN p.payment_method = 'cash' THEN p.amount ELSE 0 END) as cash_income,
    SUM(CASE WHEN p.payment_method IN ('credit_card', 'debit_card') THEN p.amount ELSE 0 END) as card_income,
    SUM(CASE WHEN p.payment_method = 'bank_transfer' THEN p.amount ELSE 0 END) as transfer_income,
    SUM(CASE WHEN p.payment_method = 'qr_payment' THEN p.amount ELSE 0 END) as qr_income
FROM financial.payments p
LEFT JOIN financial.invoices i ON p.invoice_id = i.id
GROUP BY p.payment_date
ORDER BY p.payment_date DESC;

-- View: รายจ่ายรายวัน
CREATE OR REPLACE VIEW financial.daily_expense_report AS
SELECT 
    e.expense_date,
    COUNT(*) as expense_count,
    SUM(e.total_amount) as total_expense,
    SUM(CASE WHEN e.category = 'เงินเดือนและค่าแรง' THEN e.total_amount ELSE 0 END) as salary_expense,
    SUM(CASE WHEN e.category = 'ค่าเช่า' THEN e.total_amount ELSE 0 END) as rent_expense,
    SUM(CASE WHEN e.category = 'ค่าสาธารณูปโภค' THEN e.total_amount ELSE 0 END) as utility_expense,
    SUM(CASE WHEN e.category = 'ต้นทุนขายยา' THEN e.total_amount ELSE 0 END) as medicine_cost
FROM financial.expenses e
WHERE e.status = 'paid'
GROUP BY e.expense_date
ORDER BY e.expense_date DESC;

-- View: กำไรขาดทุนรายวัน
CREATE OR REPLACE VIEW financial.daily_profit_loss AS
SELECT 
    COALESCE(i.payment_date, e.expense_date) as report_date,
    COALESCE(i.total_income, 0) as total_income,
    COALESCE(e.total_expense, 0) as total_expense,
    COALESCE(i.total_income, 0) - COALESCE(e.total_expense, 0) as net_profit,
    COALESCE(i.patient_count, 0) as patient_count,
    COALESCE(i.invoice_count, 0) as invoice_count
FROM financial.daily_income_report i
FULL OUTER JOIN financial.daily_expense_report e ON i.payment_date = e.expense_date
ORDER BY report_date DESC;

-- View: รายการยาขายดี
CREATE OR REPLACE VIEW financial.top_selling_services AS
SELECT 
    s.service_code,
    s.service_name,
    sc.category_name,
    COUNT(ii.id) as total_sales,
    SUM(ii.quantity) as total_quantity,
    SUM(ii.total_amount) as total_revenue,
    AVG(ii.unit_price) as avg_price
FROM financial.invoice_items ii
JOIN financial.services s ON ii.service_id = s.id
JOIN financial.service_categories sc ON s.category_id = sc.id
JOIN financial.invoices i ON ii.invoice_id = i.id
WHERE i.status = 'paid'
GROUP BY s.id, s.service_code, s.service_name, sc.category_name
ORDER BY total_revenue DESC;

-- View: สรุปยอดขายรายเดือน
CREATE OR REPLACE VIEW financial.monthly_summary AS
SELECT 
    EXTRACT(YEAR FROM p.payment_date) as year,
    EXTRACT(MONTH FROM p.payment_date) as month,
    TO_CHAR(p.payment_date, 'YYYY-MM') as month_year,
    COUNT(DISTINCT i.patient_id) as patient_count,
    COUNT(DISTINCT i.id) as invoice_count,
    SUM(p.amount) as total_income,
    AVG(p.amount) as avg_income_per_visit
FROM financial.payments p
LEFT JOIN financial.invoices i ON p.invoice_id = i.id
GROUP BY EXTRACT(YEAR FROM p.payment_date), EXTRACT(MONTH FROM p.payment_date), TO_CHAR(p.payment_date, 'YYYY-MM')
ORDER BY year DESC, month DESC;

-- View: ลูกหนี้ค้างชำระ
CREATE OR REPLACE VIEW financial.outstanding_invoices AS
SELECT 
    i.invoice_number,
    i.invoice_date,
    i.due_date,
    p.patient_code,
    CONCAT(p.first_name, ' ', p.last_name) as patient_name,
    i.total_amount,
    i.paid_amount,
    i.balance,
    CURRENT_DATE - i.due_date as overdue_days,
    CASE 
        WHEN i.due_date < CURRENT_DATE THEN 'เกินกำหนด'
        WHEN i.due_date = CURRENT_DATE THEN 'ครบกำหนดวันนี้'
        ELSE 'ยังไม่ครบกำหนด'
    END as status_text
FROM financial.invoices i
JOIN medical.patients p ON i.patient_id = p.id
WHERE i.status IN ('pending', 'partial') AND i.balance > 0
ORDER BY i.due_date ASC;
