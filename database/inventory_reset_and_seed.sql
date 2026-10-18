-- =====================================================================================
-- รีเซ็ตเอกสาร + คลังสินค้า แล้วใส่รายการสินค้าตั้งต้นของคลินิก (22 รายการ) — สำหรับเริ่มใช้งานจริง
-- (ข้อมูลตัวอย่างสำหรับทดลอง/demo ใช้  cd backend && npm run db:demo  แทน)
--
-- ลำดับการใช้:
--   1. สตาร์ท backend ใหม่ 1 ครั้งก่อน (DB_SYNC=true) ให้ TypeORM สร้างตาราง inventory_product_packages
--      และคอลัมน์ใหม่ (generic_name, strength, ..., lot.package_id/pack_unit/pack_size)
--   2. แบ็คอัปก่อนรัน:  pg_dump -t 'finance_*' -t 'inventory_*' -U postgres postgres > backup.sql
--   3. รันไฟล์นี้
--
-- ไม่แตะ: รายการบัญชีที่บันทึกเอง, patients, medical_records, users ฯลฯ
--
-- ข้อมูลสินค้า: ตั้งเฉพาะ "ยี่ห้อ + ขนาดบรรจุ" ที่เป็นขนาดมาตรฐานในตลาด
-- รายการที่ขนาดบรรจุต่างกันไปตามผู้ขาย ปล่อยว่างไว้ (packages ว่าง) — เพิ่มเองที่หน้าสินค้าตามใบส่งของจริง
-- ไม่ใส่ล็อต/สต็อก — ให้รับเข้าจริงด้วยเอกสารรับของเข้า (RCV) หรือ "ตั้งยอดยกมา" ที่หน้าล็อต
-- =====================================================================================

BEGIN;

-- ---------- 1) ล้างเอกสาร + คลังสินค้า ----------
-- ใช้ DELETE แทน TRUNCATE เพราะ finance_records อ้างอิง documents อยู่ (TRUNCATE จะบังคับให้ล้าง finance_records ทั้งตาราง)
-- รายการบัญชีที่บันทึกเอง (document_id = null) ยังอยู่ครบ
DELETE FROM finance_records WHERE document_id IS NOT NULL;
DELETE FROM document_items;
DELETE FROM documents;
DELETE FROM document_sequences;
DELETE FROM inventory_stock_movements;
DELETE FROM inventory_product_lots;
DELETE FROM inventory_product_packages;
DELETE FROM inventory_products;
SELECT setval(pg_get_serial_sequence(t, 'id'), 1, false)
FROM unnest(ARRAY['document_items', 'documents', 'document_sequences', 'inventory_stock_movements',
                  'inventory_product_lots', 'inventory_product_packages', 'inventory_products']) AS t;

-- ---------- 2) สินค้า ----------
INSERT INTO inventory_products
  (sku, name, generic_name, strength, dosage_form, category, unit, reorder_level, description, create_by)
VALUES
  -- ยา
  ('MED-0001', 'Paracetamol 500 mg',               'Paracetamol',        '500 mg',        'tablet',    'medicine', 'เม็ด', 100, 'ยาแก้ปวด ลดไข้', 'seed'),
  ('MED-0002', 'Normal Saline 0.9% (ล้างแผล) 1000 ml', 'Sodium chloride', '0.9%',          'external',  'medicine', 'ขวด',  5,   'NSS for irrigation — ใช้ล้างแผล ห้ามใช้ฉีด', 'seed'),
  ('MED-0003', 'Normal Saline 0.9% (IV) 1000 ml',  'Sodium chloride',    '0.9%',          'injection', 'medicine', 'ถุง',  5,   'NSS สำหรับให้ทางหลอดเลือดดำ', 'seed'),
  ('MED-0004', 'Povidone-iodine 10% solution 30 ml','Povidone-iodine',   '10%',           'external',  'medicine', 'ขวด',  3,   'น้ำยาฆ่าเชื้อแผล', 'seed'),
  ('MED-0005', 'Salbutamol nebule 2.5 mg/2.5 ml',  'Salbutamol',         '2.5 mg/2.5 ml', 'injection', 'medicine', 'หลอด', 10,  'ยาพ่นขยายหลอดลม (nebule)', 'seed'),
  ('MED-0006', 'Alcohol 70% 450 ml',               'Ethyl alcohol',      '70%',           'external',  'medicine', 'ขวด',  2,   'แอลกอฮอล์ทำความสะอาดผิวหนัง', 'seed'),

  -- เวชภัณฑ์: ฉีดยา / เจาะเลือด / ให้น้ำเกลือ
  ('SUP-0001', 'Syringe 3 ml',                      NULL, NULL, NULL, 'supply', 'ชิ้น', 20,  'กระบอกฉีดยา 3 ml', 'seed'),
  ('SUP-0002', 'Syringe 5 ml',                      NULL, NULL, NULL, 'supply', 'ชิ้น', 20,  'กระบอกฉีดยา 5 ml', 'seed'),
  ('SUP-0003', 'Needle 23G x 1"',                   NULL, NULL, NULL, 'supply', 'ชิ้น', 20,  'เข็มฉีดยา', 'seed'),
  ('SUP-0004', 'Needle 25G x 1"',                   NULL, NULL, NULL, 'supply', 'ชิ้น', 20,  'เข็มฉีดยา', 'seed'),
  ('SUP-0005', 'IV Catheter 22G',                   NULL, NULL, NULL, 'supply', 'ชิ้น', 10,  'เข็มเปิดเส้นให้น้ำเกลือ', 'seed'),
  ('SUP-0006', 'ชุดให้น้ำเกลือ (IV set)',            NULL, NULL, NULL, 'supply', 'ชุด',  5,   NULL, 'seed'),
  ('SUP-0007', 'Alcohol pad',                       NULL, NULL, NULL, 'supply', 'ชิ้น', 50,  'แผ่นแอลกอฮอล์เช็ดผิวก่อนฉีด/เจาะ', 'seed'),

  -- เวชภัณฑ์: ทำแผล
  ('SUP-0101', 'ชุดทำแผลปลอดเชื้อ (Dressing set)',   NULL, NULL, NULL, 'supply', 'ชุด',  10,  NULL, 'seed'),
  ('SUP-0102', 'ผ้าก๊อซปลอดเชื้อ 3x3 นิ้ว',          NULL, NULL, NULL, 'supply', 'ซอง',  20,  NULL, 'seed'),
  ('SUP-0103', 'สำลีก้อน',                           NULL, NULL, NULL, 'supply', 'ถุง',  2,   NULL, 'seed'),
  ('SUP-0104', 'Micropore tape 1 นิ้ว',              NULL, NULL, NULL, 'supply', 'ม้วน', 3,   'เทปปิดแผลชนิดกระดาษ', 'seed'),
  ('SUP-0105', 'Transpore tape 1 นิ้ว',              NULL, NULL, NULL, 'supply', 'ม้วน', 3,   'เทปปิดแผลชนิดพลาสติกใส', 'seed'),

  -- เวชภัณฑ์: ป้องกัน
  ('SUP-0201', 'ถุงมือยางตรวจโรค (Latex) ไซซ์ M',    NULL, NULL, NULL, 'supply', 'ชิ้น', 50,  NULL, 'seed'),
  ('SUP-0202', 'ถุงมือปลอดเชื้อ (Sterile gloves) เบอร์ 7', NULL, NULL, NULL, 'supply', 'คู่', 10, NULL, 'seed'),
  ('SUP-0203', 'หน้ากากอนามัย 3 ชั้น',                NULL, NULL, NULL, 'supply', 'ชิ้น', 50,  NULL, 'seed'),

  -- เวชภัณฑ์: ตรวจน้ำตาล
  ('SUP-0301', 'แถบตรวจน้ำตาล Accu-Chek Instant',    NULL, NULL, NULL, 'supply', 'ชิ้น', 25,  'ใช้คู่กับเครื่อง Accu-Chek Instant เท่านั้น', 'seed');

-- ---------- 3) ยี่ห้อ / ขนาดบรรจุ ----------
-- (sku, brand, pack_unit, pack_size, is_default)
INSERT INTO inventory_product_packages (product_id, brand, pack_unit, pack_size, is_default, create_by)
SELECT p.id, v.brand, v.pack_unit, v.pack_size, v.is_default, 'seed'
FROM (VALUES
  -- Paracetamol: แต่ละยี่ห้อบรรจุไม่เท่ากันได้ → เพิ่มยี่ห้ออื่นที่หน้าสินค้า
  ('MED-0001', 'Sara (Thai Nakorn Patana)', 'แผง',   10,  false),
  ('MED-0001', 'Sara (Thai Nakorn Patana)', 'กล่อง', 100, true),
  ('MED-0001', 'Tylenol (Kenvue)',          'แผง',   10,  false),

  ('SUP-0001', 'Nipro', 'กล่อง', 100, true),
  ('SUP-0002', 'Nipro', 'กล่อง', 100, true),
  ('SUP-0003', 'Nipro', 'กล่อง', 100, true),
  ('SUP-0004', 'Nipro', 'กล่อง', 100, true),
  ('SUP-0005', 'BD Venflon', 'กล่อง', 50, true),

  ('SUP-0104', '3M', 'กล่อง', 12, true),
  ('SUP-0105', '3M', 'กล่อง', 12, true),

  ('SUP-0201', 'ทั่วไป', 'กล่อง', 100, true),
  ('SUP-0202', 'ทั่วไป', 'กล่อง', 50,  true),
  ('SUP-0203', 'ทั่วไป', 'กล่อง', 50,  true),

  ('SUP-0301', 'Accu-Chek (Roche)', 'กล่อง', 50, true)
) AS v(sku, brand, pack_unit, pack_size, is_default)
JOIN inventory_products p ON p.sku = v.sku;

COMMIT;

-- ตรวจผล
SELECT p.sku, p.name, p.unit, pk.brand, pk.pack_unit, pk.pack_size, pk.is_default
FROM inventory_products p
LEFT JOIN inventory_product_packages pk ON pk.product_id = p.id
ORDER BY p.sku, pk.is_default DESC, pk.brand;
