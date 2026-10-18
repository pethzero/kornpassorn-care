// ข้อมูลจำลอง (DEMO) — สินค้าการแพทย์ 5 รายการ + เอกสาร (รับเข้า/บริการคนไข้/เบิก/ปรับยอด/ยกเลิก) + บัญชีการเงิน
//
//   cd backend && npm run db:demo
//
//   cd backend && npm run db:demo:prod   ← PRD ที่ยังว่าง: เพิ่มอย่างเดียว ไม่ล้าง (มีข้อมูลแล้วจะยกเลิกเอง)
//
// ⚠️ DEV: ล้างข้อมูลทั้งหมดของ: เอกสาร, บัญชีการเงิน (finance_records), สินค้า, ล็อต, ประวัติสต็อก — ห้ามรันบนข้อมูลจริง
//    (finance_records เดิมจะถูก backup เป็น JSON ไว้ที่ database/backup/ ก่อนล้าง)
//    ไม่แตะคนไข้จริง — สร้างคนไข้ตัวอย่างรหัส DEMO-001/DEMO-002 เพิ่ม (ถ้ายังไม่มี)
//
// สร้างเอกสารผ่าน DocumentService ตัวจริง (ไม่ได้ insert SQL ตรงๆ) → สต็อก ล็อต และบัญชีที่ได้ตรงกับที่แอปทำจริงทุกอย่าง
// วันที่ทั้งหมดนับถอยหลังจากวันที่รัน เพื่อให้สถานะ "ใกล้หมดอายุ / หมดอายุ" โชว์ได้ทุกครั้ง
// ราคา/ผู้ขาย/คนไข้ เป็นข้อมูลสมมติ
import '../src/config/load-env';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from '../src/app.module';
import { InventoryService } from '../src/modules/inventory/inventory.service';
import { DocumentService } from '../src/modules/documents/document.service';
import { FinanceService } from '../src/modules/finance/finance.service';
import { AppointmentService } from '../src/modules/appointments/appointment.service';
import { InventoryProductLot } from '../src/database/entities/inventory.entity';
import { Patient } from '../src/database/entities/medical.entity';

const USER = 'demo';

// วันที่แบบ YYYY-MM-DD ตามเวลาเครื่อง (ไม่ใช้ toISOString เพราะจะเลื่อนวันตาม UTC)
function day(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ตารางที่ demo ใช้ — DEV: ล้างก่อนใส่ / PRD (--prod): ต้องว่างอยู่แล้ว ไม่งั้นยกเลิก
const DEMO_TABLES = [
  'appointments', 'finance_records', 'document_items', 'documents', 'document_sequences',
  'inventory_stock_movements', 'inventory_product_lots', 'inventory_product_packages', 'inventory_products',
];

async function main() {
  // --prod: ใส่ demo ลงฐานข้อมูลจริงที่ยังว่าง (ตั้งระบบใหม่ ให้มีตัวอย่างลองใช้) — ไม่ล้างอะไรเลย
  //   npm run db:demo:prod   (backup PRD ก่อนเสมอ: npm run db:backup:prod)
  const prodMode = process.argv.includes('--prod');
  const isProdDb = process.env.NODE_ENV === 'production' || process.env.DB_NAME === 'kornpassorn_db';
  if (isProdDb && !prodMode) {
    throw new Error(`ไม่รัน demo (ล้างข้อมูล) กับฐานข้อมูล production (${process.env.DB_NAME}) — ใช้ npm run db:demo:prod ถ้าตั้งใจ`);
  }
  if (prodMode && !isProdDb) throw new Error('--prod ใช้กับฐานข้อมูล production เท่านั้น — DEV ใช้ npm run db:demo');
  console.log(`database: ${process.env.DB_NAME || 'kornpassorn_db_dev'} (${process.env.NODE_ENV || 'dev'})${prodMode ? ' — โหมดเพิ่มอย่างเดียว' : ''}`);
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const ds = app.get(DataSource);
  const inventory = app.get(InventoryService);
  const documents = app.get(DocumentService);
  const finance = app.get(FinanceService);
  const appointments = app.get(AppointmentService);

  try {
    if (prodMode) {
      // ---------- 0) PRD: ตรวจว่ายังว่าง — มีข้อมูลจริงแล้วห้ามปนตัวอย่างเข้าไป ----------
      const used: string[] = [];
      for (const t of DEMO_TABLES) {
        const [{ n }] = await ds.query(`SELECT count(*)::int AS n FROM "${t}"`);
        if (n > 0) used.push(`${t} (${n})`);
      }
      if (used.length) throw new Error(`ยกเลิก — PRD มีข้อมูลอยู่แล้ว ไม่ใส่ demo ปน: ${used.join(', ')}`);
    } else {
      // ---------- 0) DEV: backup บัญชีการเงินเดิม แล้วล้าง ----------
      const oldLedger = await ds.query('SELECT * FROM finance_records ORDER BY id');
      if (oldLedger.length) {
        const dir = path.join(__dirname, '..', '..', 'database', 'backup');
        fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, `finance_records-before-demo-${Date.now()}.json`);
        fs.writeFileSync(file, JSON.stringify(oldLedger, null, 2));
        console.log(`backup finance_records ${oldLedger.length} แถว → ${path.relative(process.cwd(), file)}`);
      }
      await ds.query(`TRUNCATE ${DEMO_TABLES.join(', ')} RESTART IDENTITY`);
    }

    // ---------- 1) คนไข้ตัวอย่าง ----------
    const patientRepo = ds.getRepository(Patient);
    const ensurePatient = async (patient_code: string, first_name: string, last_name: string, gender: string) =>
      (await patientRepo.findOne({ where: { patient_code } })) ??
      (await patientRepo.save(patientRepo.create({ patient_code, first_name, last_name, gender })));
    const somsri = await ensurePatient('DEMO-001', 'สมศรี', 'ใจดี (ตัวอย่าง)', 'female');
    const somchai = await ensurePatient('DEMO-002', 'สมชาย', 'รักษ์สุข (ตัวอย่าง)', 'male');

    // ---------- 2) สินค้า 5 รายการ ----------
    const para = await inventory.createProduct(
      {
        sku: 'MED-0001', name: 'Paracetamol 500 mg', generic_name: 'Paracetamol', strength: '500 mg',
        dosage_form: 'tablet', category: 'medicine', unit: 'เม็ด', sell_price: 2, reorder_level: 100,
        description: 'ยาแก้ปวด ลดไข้',
        packages: [
          { brand: 'Sara (Thai Nakorn Patana)', pack_unit: 'กล่อง', pack_size: 100, is_default: true },
          { brand: 'Tylenol (Kenvue)', pack_unit: 'แผง', pack_size: 10 },
        ],
      },
      USER,
    );
    const nss = await inventory.createProduct(
      {
        sku: 'MED-0002', name: 'Normal Saline 0.9% (ล้างแผล) 1000 ml', generic_name: 'Sodium chloride',
        strength: '0.9%', dosage_form: 'external', category: 'medicine', unit: 'ขวด', sell_price: 60,
        reorder_level: 5, description: 'NSS for irrigation — ใช้ล้างแผล ห้ามใช้ฉีด',
      },
      USER,
    );
    const betadine = await inventory.createProduct(
      {
        sku: 'MED-0003', name: 'Povidone-iodine 10% 30 ml', generic_name: 'Povidone-iodine', strength: '10%',
        dosage_form: 'external', category: 'medicine', unit: 'ขวด', sell_price: 70, reorder_level: 3,
        description: 'น้ำยาฆ่าเชื้อแผล',
      },
      USER,
    );
    const syringe = await inventory.createProduct(
      {
        sku: 'SUP-0001', name: 'Syringe 3 ml', category: 'supply', unit: 'ชิ้น', sell_price: 5, reorder_level: 50,
        packages: [{ brand: 'Nipro', pack_unit: 'กล่อง', pack_size: 100, is_default: true }],
      },
      USER,
    );
    const gloves = await inventory.createProduct(
      {
        sku: 'SUP-0002', name: 'ถุงมือยางตรวจโรค ไซซ์ M', category: 'supply', unit: 'ชิ้น', sell_price: 3,
        reorder_level: 100,
        packages: [{ brand: 'ทั่วไป', pack_unit: 'กล่อง', pack_size: 100, is_default: true }],
      },
      USER,
    );
    const pkg = (product: { packages?: { id: number; brand: string }[] }, brand: string) =>
      product.packages!.find((p) => p.brand === brand)!.id;

    // ---------- 3) เอกสาร ----------
    const done: string[] = [];
    const create = async (dto: Parameters<DocumentService['create']>[0]) => {
      const doc = await documents.create(dto, USER);
      done.push(`${doc.doc_no}  ${dto.doc_date}  ${Number(doc.total_amount).toFixed(2).padStart(9)}  ${dto.note ?? dto.reason ?? ''}`);
      return doc;
    };

    // รับของเข้า #1 — รับเป็นกล่อง (ยี่ห้อ/ขนาดบรรจุ)
    await create({
      doc_type: 'receive', doc_date: day(-30), supplier: 'บริษัทเวชภัณฑ์ตัวอย่าง จำกัด', note: 'สั่งซื้อประจำเดือน',
      items: [
        { product_id: para.id, package_id: pkg(para, 'Sara (Thai Nakorn Patana)'), pack_qty: 3, unit_price: 85,
          lot_no: 'SR2601', manufacture_date: day(-120), expiry_date: day(540) },
        { product_id: syringe.id, package_id: pkg(syringe, 'Nipro'), pack_qty: 2, unit_price: 180,
          lot_no: 'NP-S3-2509', expiry_date: day(1095) },
        { product_id: gloves.id, package_id: pkg(gloves, 'ทั่วไป'), pack_qty: 3, unit_price: 150,
          lot_no: 'GLV-M-01', expiry_date: day(730) },
      ],
    });

    // รับของเข้า #2 — ปนกัน: รับเป็นหน่วยย่อย + ยาตัวเดียวกันคนละยี่ห้อ + ล็อตใกล้หมดอายุ
    await create({
      doc_type: 'receive', doc_date: day(-25), supplier: 'ร้านยาตัวอย่าง',
      items: [
        { product_id: nss.id, quantity: 24, unit_price: 35, lot_no: 'NSS-2509', expiry_date: day(720) },
        { product_id: betadine.id, quantity: 6, unit_price: 45, lot_no: 'BT-2410', manufacture_date: day(-760),
          expiry_date: day(-3), description: 'ล็อตเก่า ราคาพิเศษ' },
        { product_id: betadine.id, quantity: 10, unit_price: 48, lot_no: 'BT-2604', expiry_date: day(700) },
        { product_id: para.id, package_id: pkg(para, 'Tylenol (Kenvue)'), pack_qty: 20, unit_price: 15,
          lot_no: 'TY-2509', expiry_date: day(20) },
      ],
    });

    // บริการคนไข้ — ค่าบริการ + ของที่ใช้ (ตัดสต็อก FEFO, ราคา = ราคาขายของสินค้า)
    await create({
      doc_type: 'patient_service', doc_date: day(-20), patient_id: somsri.id, note: 'แผลถลอกที่เข่า',
      items: [
        { item_type: 'service', category: 'ล้างแผล', amount: 200 },
        { product_id: nss.id, quantity: 1 },
        { product_id: gloves.id, quantity: 4 },
        { product_id: betadine.id, quantity: 1 },
      ],
    });
    await create({
      doc_type: 'patient_service', doc_date: day(-12), patient_id: somchai.id,
      items: [
        { item_type: 'service', category: 'ฉีดยา', amount: 150 },
        { product_id: syringe.id, quantity: 2 },
        { product_id: gloves.id, quantity: 2 },
      ],
    });

    // เบิก/หักสต็อก ใช้ภายใน — ไม่มีเงิน ไม่ลงบัญชี (Paracetamol ตัด FEFO → ล็อต Tylenol ที่หมดก่อน)
    await create({
      doc_type: 'issue', doc_date: day(-8), reason: 'ใช้ภายในคลินิก',
      items: [
        { product_id: gloves.id, quantity: 30 },
        { product_id: para.id, quantity: 20 },
      ],
    });

    await create({
      doc_type: 'patient_service', doc_date: day(-5), patient_id: somsri.id, note: 'นัดทำแผลต่อเนื่อง',
      items: [
        { item_type: 'service', category: 'ทำแผล', amount: 250 },
        { product_id: nss.id, quantity: 1 },
        { product_id: gloves.id, quantity: 4 },
        { product_id: para.id, quantity: 10, description: 'ให้กลับบ้าน' },
      ],
    });

    // เอกสารที่ยกเลิก — ถุงมือ 2 ชิ้นถูกคืนเข้าล็อต (เห็นในประวัติล็อต) + รายการบัญชีถูกลบ
    const wrong = await create({
      doc_type: 'patient_service', doc_date: day(-3), patient_id: somchai.id,
      items: [
        { item_type: 'service', category: 'ค่าตรวจรักษา', amount: 100 },
        { product_id: gloves.id, quantity: 2 },
      ],
    });
    await documents.voidDocument(wrong.id, 'บันทึกผิดคนไข้', USER);
    done[done.length - 1] += '  ← ยกเลิกแล้ว';

    // ปรับยอด — ตัดล็อตหมดอายุทิ้ง (เลือกล็อตตรงๆ)
    const expiredLot = await ds.getRepository(InventoryProductLot).findOneByOrFail({ lot_no: 'BT-2410' });
    await create({
      doc_type: 'adjust', doc_date: day(0), reason: 'หมดอายุ — ตัดทิ้ง',
      items: [
        { product_id: betadine.id, direction: 'out', product_lot_id: expiredLot.id,
          quantity: Number(expiredLot.quantity_remaining) },
      ],
    });

    // ---------- นัดหมาย (มีที่ผ่านมาแล้ว + ที่จะถึง) — ระบบภายนอกอ่านได้ทาง /api/v1/appointments ----------
    const appts = [
      { patient_id: somsri.id, appointment_date: day(-5), start_time: '10:00', end_time: '10:30', service: 'ทำแผล', status: 'completed' },
      { patient_id: somchai.id, appointment_date: day(-1), start_time: '14:00', end_time: '14:15', service: 'ฉีดยา', status: 'no_show' },
      { patient_id: somsri.id, appointment_date: day(0), start_time: '10:00', end_time: '10:30', service: 'ทำแผล', note: 'ติดตามแผลที่เข่า' },
      { patient_id: somchai.id, appointment_date: day(2), start_time: '09:30', end_time: '09:45', service: 'ฉีดยา' },
      { patient_id: somsri.id, appointment_date: day(7), start_time: '11:00', end_time: '11:30', service: 'ตรวจติดตามอาการ' },
    ];
    for (const a of appts) await appointments.create(a as any, USER);
    done.push(`นัดหมาย ${appts.length} รายการ (${day(-5)} ถึง ${day(7)})`);

    // ---------- 4) บัญชีการเงินที่บันทึกเอง (ไม่มีเอกสาร) ----------
    const manual = [
      { item_name: 'ค่าเช่าสถานที่', amount: 8000, record_date: day(-28) },
      { item_name: 'ค่าไฟฟ้า', amount: 1250, record_date: day(-15) },
      { item_name: 'ค่าน้ำประปา', amount: 180, record_date: day(-15) },
    ];
    for (const m of manual) {
      await finance.create({ ...m, category: 'expense', description: 'ตัวอย่าง (demo)' } as any, USER);
    }

    // ---------- สรุป ----------
    console.log('\nเอกสาร:');
    done.forEach((line) => console.log('  ' + line));
    const stock = await ds.query(`
      SELECT p.sku, p.name, COALESCE(SUM(l.quantity_remaining), 0)::float AS remaining, p.unit
      FROM inventory_products p LEFT JOIN inventory_product_lots l ON l.product_id = p.id
      GROUP BY p.id ORDER BY p.sku`);
    console.log('\nคงเหลือ:');
    console.table(stock);
    const ledger = await ds.query(`
      SELECT category, COUNT(*)::int AS rows, SUM(amount)::float AS total,
             COUNT(document_id)::int AS from_documents
      FROM finance_records GROUP BY category`);
    console.log('บัญชีการเงิน:');
    console.table(ledger);
    console.log('✔ demo พร้อมแล้ว');
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error('✖ FAILED:', err?.response?.message ?? err.message);
  process.exit(1);
});
