// ย้าย "ยี่ห้อ" จากแบบบรรจุ (inventory_product_packages.brand) ไปไว้ที่สินค้า (inventory_products.brand)
// และแยกสินค้าที่มีหลายยี่ห้อออกเป็นสินค้าละยี่ห้อ — แบบบรรจุได้ "ชื่อ" แทน เช่น "กล่อง 40 เม็ด"
//
//   cd backend && npm run db:migrate:brand -- --dry-run      ดูอย่างเดียว (DEV)
//   cd backend && npm run db:migrate:brand                   ทำจริง (DEV)
//   NODE_ENV=production / supabase  → PRD ในเครื่อง / Supabase (ดู task ใน .vscode)
//
// ปลอดภัย: backup ตารางที่เกี่ยวข้องเป็น JSON ก่อน · ทำใน transaction เดียว · รันซ้ำได้ (สินค้าที่มียี่ห้อแล้วจะข้าม)
// ทำได้ก่อน deploy โค้ดใหม่: คอลัมน์เดิม packages.brand ยังอยู่ (แค่ไม่บังคับกรอก) โค้ดเก่าใช้ต่อได้ระหว่างรอ
// prod-db-sync (task PRD / Supabase) เรียก migrateBrandToProduct() ให้เองก่อนอัปเดตโครงสร้าง — ถ้าปล่อยให้ TypeORM
// เทียบโครงสร้างเองก่อน มันจะเดาว่า packages.brand ถูก "เปลี่ยนชื่อ" เป็น name แล้วยี่ห้อหายจากสินค้า (เกิดกับ DEV มาแล้ว)
// ล็อต/รายการเอกสารของยี่ห้อที่ถูกแยก ย้ายไปสินค้าใหม่ด้วย (ล็อตที่ไม่ระบุแบบบรรจุ อยู่กับยี่ห้อแรก)
import '../src/config/load-env';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { DEFAULT_DB_CONFIG } from '../src/config/database.config';

const TABLES = ['inventory_products', 'inventory_product_packages', 'inventory_product_lots', 'document_items'];

// ยังต้องย้ายไหม: มี packages.brand แต่สินค้ายังไม่มีคอลัมน์ brand (หรือมีแต่ยังมีสินค้าที่ยังไม่ได้ย้าย)
export async function brandMigrationPending(ds: DataSource): Promise<boolean> {
  const cols: { table_name: string; column_name: string }[] = await ds.query(
    `SELECT table_name, column_name FROM information_schema.columns
      WHERE (table_name = 'inventory_product_packages' AND column_name IN ('brand', 'name'))
         OR (table_name = 'inventory_products' AND column_name = 'brand')`,
  );
  const has = (t: string, c: string) => cols.some((x) => x.table_name === t && x.column_name === c);
  if (!has('inventory_product_packages', 'brand')) return false;
  if (!has('inventory_products', 'brand') || !has('inventory_product_packages', 'name')) return true;
  const [{ n }] = await ds.query(
    `SELECT count(*)::int AS n FROM inventory_product_packages WHERE name IS NULL OR (brand IS NOT NULL AND trim(brand) <> ''
       AND product_id IN (SELECT id FROM inventory_products WHERE brand IS NULL))`,
  );
  return n > 0;
}

export async function migrateBrandToProduct(ds: DataSource, opts: { dryRun?: boolean } = {}): Promise<number> {
  const dryRun = !!opts.dryRun;
  const runner = ds.createQueryRunner();
  await runner.startTransaction();
  try {
    const q = (sql: string, params?: any[]) => runner.query(sql, params);

    // 1) โครงสร้าง: เพิ่มคอลัมน์ใหม่ + ไม่บังคับ brand ของแบบบรรจุ (โค้ดใหม่ไม่กรอกแล้ว)
    await q(`ALTER TABLE inventory_products ADD COLUMN IF NOT EXISTS brand varchar(100)`);
    await q(`ALTER TABLE inventory_product_packages ADD COLUMN IF NOT EXISTS name varchar(100)`);
    await q(`ALTER TABLE inventory_product_packages ALTER COLUMN brand DROP NOT NULL`);

    if (!dryRun) {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const dir = path.join(__dirname, '..', '..', 'database', 'backup', `brand-migration-${process.env.NODE_ENV || 'dev'}-${stamp}`);
      fs.mkdirSync(dir, { recursive: true });
      for (const t of TABLES) fs.writeFileSync(path.join(dir, `${t}.json`), JSON.stringify(await q(`SELECT * FROM "${t}"`), null, 2));
      console.log(`backup → ${path.relative(process.cwd(), dir)}\n`);
    }

    // 2) ทีละสินค้า: ยี่ห้อแรก (ของแบบบรรจุประจำ) อยู่กับสินค้าเดิม ยี่ห้ออื่นแยกเป็นสินค้าใหม่
    const products: any[] = await q(`SELECT * FROM inventory_products WHERE brand IS NULL ORDER BY id`);
    let created = 0;
    for (const p of products) {
      const pkgs: { id: number; brand: string | null }[] = await q(
        `SELECT id, brand FROM inventory_product_packages WHERE product_id = $1 AND brand IS NOT NULL AND trim(brand) <> ''
          ORDER BY is_default DESC, id`,
        [p.id],
      );
      const groups = new Map<string, { brand: string; ids: number[] }>();
      for (const pk of pkgs) {
        const key = pk.brand!.trim().toLowerCase();
        if (!groups.has(key)) groups.set(key, { brand: pk.brand!.trim(), ids: [] });
        groups.get(key)!.ids.push(pk.id);
      }
      const [first, ...others] = [...groups.values()];
      if (!first) continue;

      await q(`UPDATE inventory_products SET brand = $1 WHERE id = $2`, [first.brand, p.id]);
      console.log(`· ${p.name} → ยี่ห้อ ${first.brand}${others.length ? ` · แยกอีก ${others.length} ยี่ห้อ` : ''}`);

      for (const g of others) {
        const [{ id: newId }] = await q(
          `INSERT INTO inventory_products
             (sku, name, brand, category, generic_name, strength, dosage_form, unit, sell_price, reorder_level, description, is_active, create_by, create_date)
           VALUES (NULL, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'migration', now()) RETURNING id`,
          [p.name, g.brand, p.category, p.generic_name, p.strength, p.dosage_form, p.unit, p.sell_price, p.reorder_level, p.description, p.is_active],
        );
        created++;
        await q(`UPDATE inventory_product_packages SET product_id = $1 WHERE id = ANY($2)`, [newId, g.ids]);
        const lotIds: number[] = (await q(`SELECT id FROM inventory_product_lots WHERE package_id = ANY($1)`, [g.ids])).map((r: any) => r.id);
        if (lotIds.length) await q(`UPDATE inventory_product_lots SET product_id = $1 WHERE id = ANY($2)`, [newId, lotIds]);
        const items = await q(
          `UPDATE document_items SET product_id = $1 WHERE package_id = ANY($2) OR product_lot_id = ANY($3) RETURNING id`,
          [newId, g.ids, lotIds],
        );
        console.log(`    + สินค้าใหม่ #${newId} ${p.name} · ${g.brand} (แบบบรรจุ ${g.ids.length}, ล็อต ${lotIds.length}, รายการเอกสาร ${items.length})`);
      }
    }

    // 3) ชื่อแบบบรรจุ: "กล่อง 40 เม็ด" (แก้ทีหลังได้ในหน้าเว็บ) + ทุกสินค้าต้องมีแบบบรรจุประจำ 1 อัน
    await q(`
      UPDATE inventory_product_packages pk
         SET name = trim(pk.pack_unit || ' ' || pk.pack_size || ' ' || COALESCE(p.unit, ''))
        FROM inventory_products p
       WHERE p.id = pk.product_id AND pk.name IS NULL`);
    await q(`
      UPDATE inventory_product_packages SET is_default = true
       WHERE id IN (SELECT min(id) FROM inventory_product_packages GROUP BY product_id HAVING NOT bool_or(is_default))`);

    if (dryRun) {
      await runner.rollbackTransaction();
      console.log(`\n(ดูอย่างเดียว — ยกเลิกทั้งหมดแล้ว) จะแยกสินค้าใหม่ ${created} รายการ`);
    } else {
      await runner.commitTransaction();
      console.log(`\n✔ ย้ายยี่ห้อไปที่สินค้าเรียบร้อย — แยกสินค้าใหม่ ${created} รายการ`);
    }
    return created;
  } catch (e) {
    await runner.rollbackTransaction();
    throw e;
  } finally {
    await runner.release();
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const ds = new DataSource({ ...(DEFAULT_DB_CONFIG as any), entities: [], synchronize: false, logging: false });
  await ds.initialize();
  console.log(`database: "${(DEFAULT_DB_CONFIG as any).database}" (${process.env.NODE_ENV || 'dev'})${dryRun ? ' — ดูอย่างเดียว' : ''}\n`);
  try {
    if (!(await brandMigrationPending(ds))) return console.log('✔ ย้ายยี่ห้อไปที่สินค้าแล้ว — ไม่มีอะไรต้องทำ');
    await migrateBrandToProduct(ds, { dryRun });
  } finally {
    await ds.destroy();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('✖ FAILED:', err.message);
    process.exit(1);
  });
}
