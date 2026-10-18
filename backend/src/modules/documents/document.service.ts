import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  DOCUMENT_PREFIX,
  DOCUMENT_TYPES,
  Document,
  DocumentItem,
} from '../../database/entities/document.entity';
import { FinanceRecord } from '../../database/entities/finance-record.entity';
import { InventoryProduct, InventoryStockMovement } from '../../database/entities/inventory.entity';
import { Patient } from '../../database/entities/medical.entity';
import { InventoryService } from '../inventory/inventory.service';
import { CreateDocumentDto, CreateDocumentItemDto } from './dto/create-document.dto';
import { QueryDocumentDto } from './dto/query-document.dto';

const round2 = (n: number) => Math.round(n * 100) / 100;

// เอกสาร (รับของเข้า / เบิก-หักสต็อก / บริการคนไข้ / ปรับยอด)
// สร้าง 1 ใบ = ตัด/เติมสต็อกตามบรรทัด + ลงบัญชีการเงิน (finance_records) ถ้ามีเงิน — ทั้งหมดใน DB transaction เดียว
@Injectable()
export class DocumentService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    private readonly inventoryService: InventoryService,
  ) {}

  // เลขที่เอกสาร เช่น RCV-2026-0001 — รันแยกตามประเภท+ปีของวันที่เอกสาร, upsert แบบ atomic กันเลขชน
  private async generateDocNo(manager: EntityManager, prefix: string, docDate: string): Promise<string> {
    const year = Number(docDate.slice(0, 4));
    const rows = await manager.query(
      `INSERT INTO document_sequences (doc_prefix, doc_year, last_number) VALUES ($1, $2, 1)
       ON CONFLICT (doc_prefix, doc_year) DO UPDATE SET last_number = document_sequences.last_number + 1
       RETURNING last_number`,
      [prefix, year],
    );
    return `${prefix}-${year}-${String(rows[0].last_number).padStart(4, '0')}`;
  }

  async create(dto: CreateDocumentDto, currentUser?: string): Promise<Document> {
    this.validateHeader(dto);

    const id = await this.dataSource.transaction(async (manager) => {
      const patient = dto.patient_id
        ? await manager.getRepository(Patient).findOne({ where: { id: dto.patient_id } })
        : null;
      if (dto.patient_id && !patient) throw new BadRequestException(`ไม่พบคนไข้ ID ${dto.patient_id}`);

      const doc_no = await this.generateDocNo(manager, DOCUMENT_PREFIX[dto.doc_type], dto.doc_date);
      const header = await manager.save(
        manager.getRepository(Document).create({
          doc_no,
          doc_type: dto.doc_type,
          doc_date: dto.doc_date,
          supplier: dto.supplier || null,
          reason: dto.reason || null,
          note: dto.note || null,
          patient_id: dto.doc_type === 'patient_service' ? dto.patient_id : null,
          create_by: currentUser || 'system',
        }),
      );

      let total = 0;
      for (let i = 0; i < dto.items.length; i++) {
        total += await this.createItem(manager, header, dto.items[i], i + 1);
      }

      header.total_amount = round2(total);
      await manager.save(header);
      await this.postToLedger(manager, header, patient, currentUser);
      return header.id;
    });

    return this.findOne(id);
  }

  private validateHeader(dto: CreateDocumentDto) {
    if (dto.doc_type === 'patient_service' && !dto.patient_id) {
      throw new BadRequestException('เอกสารบริการคนไข้ต้องเลือกคนไข้');
    }
    if (dto.doc_type === 'adjust' && !dto.reason) {
      throw new BadRequestException('เอกสารปรับยอดต้องระบุเหตุผล เช่น หมดอายุ / ชำรุด / นับสต็อก');
    }
    const onlyProducts = dto.doc_type !== 'patient_service';
    dto.items.forEach((item, i) => {
      const type = item.item_type || 'product';
      if (onlyProducts && type !== 'product') {
        throw new BadRequestException(`บรรทัดที่ ${i + 1}: เอกสารประเภทนี้มีได้เฉพาะรายการสินค้า`);
      }
      if (type === 'product' && !item.product_id) {
        throw new BadRequestException(`บรรทัดที่ ${i + 1}: กรุณาเลือกสินค้า`);
      }
    });
  }

  // สร้าง 1 บรรทัด + ขยับสต็อก แล้วคืนยอดเงินของบรรทัดนั้น
  private async createItem(
    manager: EntityManager,
    header: Document,
    dto: CreateDocumentItemDto,
    lineNo: number,
  ): Promise<number> {
    const type = dto.item_type || 'product';
    const label = `บรรทัดที่ ${lineNo}`;
    const itemRepo = manager.getRepository(DocumentItem);

    // ----- ค่าบริการ / อื่นๆ (มีแค่ใน patient_service) -----
    if (type !== 'product') {
      if (!dto.category && !dto.description) throw new BadRequestException(`${label}: กรุณาระบุชื่อบริการ`);
      const amount = round2(dto.amount ?? (dto.unit_price ?? 0) * (dto.quantity ?? 1));
      if (amount <= 0) throw new BadRequestException(`${label}: กรุณาระบุจำนวนเงิน`);
      await manager.save(
        itemRepo.create({
          document_id: header.id,
          line_no: lineNo,
          item_type: type,
          category: dto.category || null,
          quantity: dto.quantity ?? null,
          unit_price: dto.unit_price ?? null,
          amount,
          description: dto.description || null,
        }),
      );
      return amount;
    }

    const product = await manager.getRepository(InventoryProduct).findOne({ where: { id: dto.product_id } });
    if (!product) throw new BadRequestException(`${label}: ไม่พบสินค้า ID ${dto.product_id}`);

    // ----- รับของเข้า -----
    if (header.doc_type === 'receive') {
      if (!dto.lot_no) throw new BadRequestException(`${label}: กรุณาระบุเลขล็อต`);

      let quantity = dto.quantity;
      let packQty: number | null = null;
      if (dto.package_id && dto.pack_qty) {
        const pkg = await this.inventoryService.getPackage(manager, product.id, dto.package_id);
        packQty = dto.pack_qty;
        quantity = dto.pack_qty * pkg!.pack_size;
      }
      if (!quantity) throw new BadRequestException(`${label}: กรุณาระบุจำนวนที่รับเข้า`);

      const amount = round2(dto.amount ?? (dto.unit_price ?? 0) * (packQty ?? quantity));
      const item = await manager.save(
        itemRepo.create({
          document_id: header.id,
          line_no: lineNo,
          item_type: 'product',
          direction: 'in',
          product_id: product.id,
          package_id: dto.package_id ?? null,
          pack_qty: packQty,
          quantity,
          unit_price: dto.unit_price ?? null,
          amount,
          description: dto.description || null,
        }),
      );

      const lot = await this.inventoryService.receiveIntoLot(
        manager,
        {
          product_id: product.id,
          lot_no: dto.lot_no,
          manufacture_date: dto.manufacture_date,
          expiry_date: dto.expiry_date,
          package_id: dto.package_id ?? null,
          received_pack_qty: packQty,
          quantity_in: quantity,
          unit_cost: amount > 0 ? round2(amount / quantity) : undefined,
          supplier: header.supplier,
          received_date: header.doc_date,
          note: `รับเข้าจาก ${header.doc_no}`,
        },
        item.id,
      );
      item.product_lot_id = lot.id;
      await manager.save(item);
      return amount;
    }

    // ----- ออก (issue / patient_service) หรือ ปรับยอด (adjust เข้า/ออก) -----
    if (!dto.quantity) throw new BadRequestException(`${label}: กรุณาระบุจำนวน`);
    const direction: 'in' | 'out' = header.doc_type === 'adjust' ? (dto.direction ?? 'out') : 'out';

    let amount = 0;
    let unitPrice: number | null = null;
    if (header.doc_type === 'patient_service') {
      unitPrice = dto.unit_price ?? (product.sell_price != null ? Number(product.sell_price) : 0);
      amount = round2(dto.amount ?? unitPrice * dto.quantity);
    }

    const item = await manager.save(
      itemRepo.create({
        document_id: header.id,
        line_no: lineNo,
        item_type: 'product',
        direction,
        product_id: product.id,
        product_lot_id: dto.product_lot_id ?? null,
        quantity: dto.quantity,
        unit_price: unitPrice,
        amount,
        description: dto.description || null,
      }),
    );

    if (direction === 'in') {
      // ปรับยอดเพิ่ม (นับสต็อกเจอเกิน) — ต้องระบุล็อตที่จะเติม
      if (!dto.product_lot_id) throw new BadRequestException(`${label}: ปรับยอดเพิ่มต้องเลือกล็อต`);
      await this.inventoryService.addStockToLot(manager, dto.product_lot_id, dto.quantity, item.id);
    } else if (dto.product_lot_id) {
      await this.inventoryService.deductStockFromLot(manager, dto.product_lot_id, dto.quantity, item.id);
    } else {
      // FEFO — ข้ามล็อตหมดอายุเฉพาะตอนจ่ายใช้/จ่ายให้คนไข้ (ปรับยอดตัดทิ้งต้องตัดของหมดอายุได้)
      const asOf = header.doc_type === 'adjust' ? undefined : header.doc_date;
      const deducted = await this.inventoryService.deductStockFefo(manager, product.id, dto.quantity, item.id, asOf);
      item.product_lot_id = deducted[0]?.product_lot_id ?? null;
      await manager.save(item);
    }
    return amount;
  }

  // ลงบัญชีการเงิน 1 รายการต่อเอกสาร (เฉพาะเอกสารที่มีเงิน)
  private async postToLedger(
    manager: EntityManager,
    doc: Document,
    patient: Patient | null,
    currentUser?: string,
  ) {
    if (Number(doc.total_amount) <= 0) return;

    let item_name: string;
    let category: 'income' | 'expense';
    if (doc.doc_type === 'receive') {
      category = 'expense';
      item_name = `รับของเข้า ${doc.doc_no}${doc.supplier ? ` — ${doc.supplier}` : ''}`;
    } else if (doc.doc_type === 'patient_service') {
      category = 'income';
      const name = patient ? `${patient.first_name} ${patient.last_name}`.trim() : '';
      item_name = `บริการคนไข้ ${doc.doc_no}${name ? ` — ${name}` : ''}`;
    } else {
      return;
    }

    await manager.save(
      manager.getRepository(FinanceRecord).create({
        item_name,
        category,
        amount: Number(doc.total_amount),
        record_date: new Date(doc.doc_date),
        description: doc.note ?? null,
        document_id: doc.id,
        create_by: currentUser || 'system',
      }),
    );
  }

  async findAll(query: QueryDocumentDto) {
    const { doc_type, status, start_date, end_date, search, patient_id, product_id, page = 1, limit = 20 } = query;

    const qb = this.documentRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.patient', 'patient')
      .loadRelationCountAndMap('d.item_count', 'd.items');

    if (doc_type) qb.andWhere('d.doc_type = :doc_type', { doc_type });
    if (status) qb.andWhere('d.status = :status', { status });
    if (patient_id) qb.andWhere('d.patient_id = :patient_id', { patient_id });
    if (start_date) qb.andWhere('d.doc_date >= :start_date', { start_date });
    if (end_date) qb.andWhere('d.doc_date <= :end_date', { end_date });
    if (product_id) {
      qb.andWhere('EXISTS (SELECT 1 FROM document_items di WHERE di.document_id = d.id AND di.product_id = :product_id)', {
        product_id,
      });
    }
    if (search) {
      qb.andWhere(
        `(d.doc_no ILIKE :search OR d.note ILIKE :search OR d.supplier ILIKE :search OR d.reason ILIKE :search
          OR patient.first_name ILIKE :search OR patient.last_name ILIKE :search)`,
        { search: `%${search}%` },
      );
    }

    qb.orderBy('d.doc_date', 'DESC')
      .addOrderBy('d.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, page, limit, total_pages: Math.ceil(total / limit) } };
  }

  // สรุปเดือนนี้แยกตามประเภท (ไม่นับเอกสารที่ยกเลิก)
  async getSummary() {
    const rows = await this.documentRepo
      .createQueryBuilder('d')
      .select('d.doc_type', 'doc_type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(d.total_amount), 0)', 'amount')
      .where("d.status = 'confirmed'")
      .andWhere("date_trunc('month', d.doc_date) = date_trunc('month', CURRENT_DATE)")
      .groupBy('d.doc_type')
      .getRawMany<{ doc_type: string; count: string; amount: string }>();

    const byType = Object.fromEntries(
      DOCUMENT_TYPES.map((t) => {
        const row = rows.find((r) => r.doc_type === t);
        return [t, { count: Number(row?.count ?? 0), amount: Number(row?.amount ?? 0) }];
      }),
    );
    return { month: byType };
  }

  async findOne(id: number) {
    const doc = await this.documentRepo.findOne({
      where: { id },
      relations: ['items', 'items.product', 'items.product_lot', 'items.package', 'patient'],
      order: { items: { line_no: 'ASC' } },
    });
    if (!doc) throw new NotFoundException(`ไม่พบเอกสาร ID: ${id}`);

    const ledger_entries = await this.dataSource
      .getRepository(FinanceRecord)
      .find({ where: { document_id: id }, order: { id: 'ASC' } });
    return { ...doc, ledger_entries };
  }

  // ล็อตที่บรรทัดรับเข้านี้สร้างขึ้นใหม่ (การเคลื่อนไหวแรกของล็อตมาจากบรรทัดนี้) และไม่เคยมีเอกสารอื่นแตะ
  // หลังย้อนสต็อกแล้วจะเหลือ 0 → ลบทิ้ง ไม่ให้ค้างเป็นล็อตว่างในหน้าล็อต
  // ล็อตเดิมที่แค่ "เติมเพิ่ม" (มีอยู่ก่อนเอกสารนี้) ไม่ลบ — เก็บเลขล็อตไว้ใน description ของบรรทัดให้เอกสารยังอ่านได้
  private async removeLotCreatedBy(manager: EntityManager, item: DocumentItem) {
    if (!item.product_lot_id) return;
    const [info] = await manager.query(
      `SELECT l.lot_no, l.quantity_remaining::float AS remaining,
              (SELECT document_item_id FROM inventory_stock_movements WHERE product_lot_id = l.id ORDER BY id LIMIT 1) AS first_item,
              (SELECT COUNT(*)::int FROM inventory_stock_movements
                WHERE product_lot_id = l.id AND (document_item_id IS NULL OR document_item_id <> $2)) AS others
       FROM inventory_product_lots l WHERE l.id = $1`,
      [item.product_lot_id, item.id],
    );
    if (!info || Number(info.first_item) !== item.id || info.others > 0 || info.remaining !== 0) return;

    await manager.query(
      `UPDATE document_items
       SET description = 'ล็อต ' || $2 || COALESCE(' — ' || NULLIF(description, ''), ''), product_lot_id = NULL
       WHERE product_lot_id = $1`,
      [item.product_lot_id, info.lot_no],
    );
    // ประวัติสต็อกของล็อตลบตาม (onDelete: CASCADE)
    await manager.query('DELETE FROM inventory_product_lots WHERE id = $1', [item.product_lot_id]);
  }

  // ยกเลิกเอกสาร: ย้อนสต็อกทุกการเคลื่อนไหวที่เอกสารนี้ทำ + ลบรายการบัญชีที่ลงไว้
  //   (รับของเข้า: ล็อตที่เอกสารนี้สร้างเองถูกลบด้วย — ดู removeLotCreatedBy)
  async voidDocument(id: number, reason: string | undefined, currentUser?: string) {
    await this.dataSource.transaction(async (manager) => {
      const doc = await manager.getRepository(Document).findOne({ where: { id }, relations: ['items'] });
      if (!doc) throw new NotFoundException(`ไม่พบเอกสาร ID: ${id}`);
      if (doc.status === 'void') throw new BadRequestException('เอกสารนี้ถูกยกเลิกไปแล้ว');

      for (const item of doc.items) {
        const movements = await manager
          .getRepository(InventoryStockMovement)
          .find({ where: { document_item_id: item.id } });
        for (const m of movements) {
          if (m.movement_type === 'out') {
            await this.inventoryService.addStockToLot(manager, m.product_lot_id, Number(m.quantity), item.id);
          } else if (m.movement_type === 'in') {
            // ของที่รับเข้าถูกใช้ไปแล้วจะตัดคืนไม่ได้ → throw ให้ผู้ใช้จัดการเอกสารที่ใช้ของนั้นก่อน
            await this.inventoryService.deductStockFromLot(manager, m.product_lot_id, Number(m.quantity), item.id);
          }
        }
      }

      await manager.getRepository(FinanceRecord).delete({ document_id: id });

      if (doc.doc_type === 'receive') {
        for (const item of doc.items) await this.removeLotCreatedBy(manager, item);
      }

      doc.status = 'void';
      doc.void_reason = reason || null;
      doc.void_by = currentUser || 'system';
      doc.void_date = new Date();
      await manager.save(doc);
    });
    return this.findOne(id);
  }
}
