import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, IsNull, Not, Repository } from 'typeorm';
import {
  InventoryProduct,
  InventoryProductPackage,
  InventoryProductLot,
  InventoryStockMovement,
} from '../../database/entities/inventory.entity';
import {
  CreateInventoryProductDto,
  InventoryProductPackageInputDto,
} from './dto/create-inventory-product.dto';
import { UpdateInventoryProductDto } from './dto/update-inventory-product.dto';
import { QueryInventoryProductDto } from './dto/query-inventory-product.dto';
import { CreateInventoryLotDto } from './dto/create-inventory-lot.dto';
import { UpdateInventoryLotDto } from './dto/update-inventory-lot.dto';
import { QueryInventoryLotDto } from './dto/query-inventory-lot.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryProduct)
    private readonly productRepo: Repository<InventoryProduct>,
    @InjectRepository(InventoryProductLot)
    private readonly lotRepo: Repository<InventoryProductLot>,
    @InjectRepository(InventoryStockMovement)
    private readonly movementRepo: Repository<InventoryStockMovement>,
  ) {}

  // ----- Products (master data) -----

  // SKU ว่าง = ไม่มี SKU (null) / ซ้ำกับสินค้าอื่น = แจ้งชื่อสินค้าที่ใช้อยู่ แทน error unique constraint ของ DB
  private async normalizeSku(sku: string | null | undefined, exceptId?: number): Promise<string | null | undefined> {
    if (sku === undefined) return undefined;
    const value = sku?.trim() || null;
    if (value) {
      const owner = await this.productRepo.findOne({ where: { sku: value } });
      if (owner && owner.id !== exceptId) {
        throw new BadRequestException(`SKU "${value}" ใช้กับสินค้า "${owner.name}" อยู่แล้ว`);
      }
    }
    return value;
  }

  async createProduct(dto: CreateInventoryProductDto, currentUser?: string) {
    const { packages, ...productData } = dto;
    const sku = await this.normalizeSku(productData.sku);
    const id = await this.productRepo.manager.transaction(async (manager) => {
      const saved = await manager.save(
        manager.getRepository(InventoryProduct).create({
          ...productData,
          sku: sku ?? null,
          create_by: currentUser || 'system',
        }),
      );
      if (packages) await this.syncPackages(manager, saved.id, packages, currentUser);
      return saved.id;
    });
    return this.findOneProduct(id);
  }

  async findAllProducts(query: QueryInventoryProductDto) {
    const { search, category, is_active, page = 1, limit = 20 } = query;
    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.packages', 'pkg');

    if (search) {
      // ค้นได้ทั้งชื่อสินค้า ชื่อสามัญ SKU ยี่ห้อ และบาร์โค้ด
      qb.andWhere(
        `(p.name ILIKE :search OR p.sku ILIKE :search OR p.generic_name ILIKE :search
          OR EXISTS (SELECT 1 FROM inventory_product_packages sp
                     WHERE sp.product_id = p.id AND (sp.brand ILIKE :search OR sp.barcode = :exact)))`,
        { search: `%${search}%`, exact: search },
      );
    }
    if (category) qb.andWhere('p.category = :category', { category });
    if (is_active !== undefined)
      qb.andWhere('p.is_active = :is_active', {
        is_active: is_active === 'true',
      });

    qb.orderBy('p.name', 'ASC')
      .addOrderBy('pkg.is_default', 'DESC')
      .addOrderBy('pkg.brand', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [products, total] = await qb.getManyAndCount();
    const data = await this.attachStockRemaining(products);
    return {
      data,
      meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
    };
  }

  async findOneProduct(id: number) {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['packages'],
      order: { packages: { is_default: 'DESC', brand: 'ASC' } },
    });
    if (!product) throw new NotFoundException(`ไม่พบสินค้า ID: ${id}`);
    const [withStock] = await this.attachStockRemaining([product]);
    return withStock;
  }

  async updateProduct(id: number, dto: UpdateInventoryProductDto, currentUser?: string) {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException(`ไม่พบสินค้า ID: ${id}`);

    const { packages, ...productData } = dto;
    const sku = await this.normalizeSku(productData.sku, id);
    await this.productRepo.manager.transaction(async (manager) => {
      Object.assign(product, productData, {
        ...(sku !== undefined ? { sku } : {}),
        modify_by: currentUser || 'system',
        modify_date: new Date(),
      });
      await manager.save(product);
      if (packages) await this.syncPackages(manager, id, packages, currentUser);
    });
    return this.findOneProduct(id);
  }

  // ลบสินค้าได้เมื่อ (1) ไม่อยู่ในเอกสารที่ยังใช้งาน และ (2) ไม่มีสต็อกเหลือในล็อตใด
  // เอกสารที่ยกเลิกแล้วยังเก็บไว้: บรรทัดของสินค้านี้เก็บชื่อเป็นข้อความแทน แล้วตัดการอ้างอิงสินค้า/ล็อต/ยี่ห้อออก
  // ล็อต + ประวัติสต็อก + ยี่ห้อ ลบตามสินค้า (onDelete: CASCADE)
  async removeProduct(id: number) {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException(`ไม่พบสินค้า ID: ${id}`);

    const activeDocs: { doc_no: string }[] = await this.productRepo.query(
      `SELECT DISTINCT d.doc_no
       FROM document_items di JOIN documents d ON d.id = di.document_id
       WHERE di.product_id = $1 AND d.status <> 'void'
       ORDER BY d.doc_no`,
      [id],
    );
    if (activeDocs.length) {
      const list = activeDocs.slice(0, 3).map((r) => r.doc_no).join(', ');
      const more = activeDocs.length > 3 ? ` และอีก ${activeDocs.length - 3} ใบ` : '';
      throw new BadRequestException(
        `"${product.name}" อยู่ในเอกสารที่ใช้งาน ${activeDocs.length} ใบ (${list}${more}) — ยกเลิกเอกสารก่อน หรือปิดใช้งานสินค้าแทน`,
      );
    }

    const [{ remaining }] = await this.productRepo.query(
      'SELECT COALESCE(SUM(quantity_remaining), 0)::float AS remaining FROM inventory_product_lots WHERE product_id = $1',
      [id],
    );
    if (remaining > 0) {
      throw new BadRequestException(
        `"${product.name}" ยังมีสต็อกเหลือ ${remaining} ${product.unit ?? 'หน่วย'} — ปรับยอดออกให้เป็น 0 ก่อน หรือปิดใช้งานแทน`,
      );
    }

    await this.productRepo.manager.transaction(async (manager) => {
      // เอกสารยกเลิก: เก็บชื่อสินค้าไว้ใน description ให้ยังอ่านย้อนหลังได้
      await manager.query(
        `UPDATE document_items
         SET description = $2 || COALESCE(' — ' || NULLIF(description, ''), ''),
             product_id = NULL, product_lot_id = NULL, package_id = NULL
         WHERE product_id = $1`,
        [id, `${product.name} (สินค้าถูกลบแล้ว)`],
      );
      await manager.delete(InventoryProduct, id);
    });
    return { id, name: product.name };
  }

  // คงเหลือรวมทุกล็อต (หน่วย product.unit) — ใช้แสดงในรายการสินค้า/เทียบ reorder_level
  private async attachStockRemaining(
    products: InventoryProduct[],
  ): Promise<(InventoryProduct & { stock_remaining: number })[]> {
    if (products.length === 0) return [];

    const rows = await this.lotRepo
      .createQueryBuilder('lot')
      .select('lot.product_id', 'product_id')
      .addSelect('COALESCE(SUM(lot.quantity_remaining), 0)', 'total')
      .where('lot.product_id IN (:...ids)', { ids: products.map((p) => p.id) })
      .groupBy('lot.product_id')
      .getRawMany<{ product_id: number; total: string }>();

    const totals = new Map(rows.map((r) => [Number(r.product_id), Number(r.total)]));
    return products.map((p) => ({ ...p, stock_remaining: totals.get(p.id) ?? 0 }));
  }

  // ทำให้ packages ของสินค้าตรงกับรายการที่ส่งมา: มี id = แก้, ไม่มี id = เพิ่ม, ไม่ได้ส่งมา = ลบ
  // (ถ้า package ที่จะลบมีล็อตอ้างอิงแล้ว จะปิดใช้งานแทน เพื่อให้ประวัติล็อตยังโยงกลับมาได้)
  private async syncPackages(
    manager: EntityManager,
    productId: number,
    inputs: InventoryProductPackageInputDto[],
    currentUser?: string,
  ) {
    const pkgRepo = manager.getRepository(InventoryProductPackage);
    const existing = await pkgRepo.find({ where: { product_id: productId } });
    const existingById = new Map(existing.map((p) => [p.id, p]));

    const seen = new Set<string>();
    for (const input of inputs) {
      if (input.id && !existingById.has(input.id)) {
        throw new BadRequestException(`ไม่พบแบบบรรจุ ID ${input.id} ของสินค้านี้`);
      }
      const key = `${input.brand.trim().toLowerCase()}|${input.pack_unit.trim()}|${input.pack_size}`;
      if (seen.has(key)) {
        throw new BadRequestException(
          `แบบบรรจุซ้ำกัน: ${input.brand} ${input.pack_unit} ละ ${input.pack_size}`,
        );
      }
      seen.add(key);
    }
    if (inputs.filter((p) => p.is_default && p.is_active !== false).length > 1) {
      throw new BadRequestException('ตั้งแบบบรรจุที่ซื้อประจำได้แค่ 1 แบบ');
    }

    // ลบก่อน เพื่อไม่ให้ชน unique index เวลาลบแล้วเพิ่มค่าเดิมกลับเข้ามาในครั้งเดียวกัน
    const keepIds = new Set(inputs.filter((p) => p.id).map((p) => p.id));
    const removed = existing.filter((p) => !keepIds.has(p.id));
    if (removed.length > 0) {
      const usedRows = await manager
        .getRepository(InventoryProductLot)
        .createQueryBuilder('lot')
        .select('DISTINCT lot.package_id', 'package_id')
        .where('lot.package_id IN (:...ids)', { ids: removed.map((p) => p.id) })
        .getRawMany<{ package_id: number }>();
      const usedIds = new Set(usedRows.map((r) => Number(r.package_id)));

      const toDelete = removed.filter((p) => !usedIds.has(p.id)).map((p) => p.id);
      const toDeactivate = removed.filter((p) => usedIds.has(p.id)).map((p) => p.id);
      if (toDelete.length) await pkgRepo.delete({ id: In(toDelete) });
      if (toDeactivate.length) {
        await pkgRepo.update(
          { id: In(toDeactivate) },
          { is_active: false, is_default: false, modify_by: currentUser || 'system', modify_date: new Date() },
        );
      }
    }

    for (const input of inputs) {
      const data = {
        brand: input.brand.trim(),
        pack_unit: input.pack_unit.trim(),
        pack_size: input.pack_size,
        barcode: input.barcode?.trim() || undefined,
        description: input.description?.trim() || null,
        note: input.note?.trim() || null,
        last_pack_cost: input.last_pack_cost,
        is_default: !!input.is_default && input.is_active !== false,
        is_active: input.is_active ?? true,
      };
      if (input.id) {
        const pkg = existingById.get(input.id)!;
        Object.assign(pkg, data, { modify_by: currentUser || 'system', modify_date: new Date() });
        await manager.save(pkg);
      } else {
        await manager.save(
          pkgRepo.create({ ...data, product_id: productId, create_by: currentUser || 'system' }),
        );
      }
    }
  }

  // หา package ของสินค้า — ต้องเป็นของสินค้าเดียวกัน (กันส่ง package ของยาตัวอื่นมา)
  private async resolvePackage(
    manager: EntityManager,
    productId: number,
    packageId: number | null | undefined,
    allowInactiveId?: number | null,
  ): Promise<InventoryProductPackage | null> {
    if (!packageId) return null;
    const pkg = await manager
      .getRepository(InventoryProductPackage)
      .findOne({ where: { id: packageId, product_id: productId } });
    if (!pkg) throw new BadRequestException(`ไม่พบแบบบรรจุ ID ${packageId} ของสินค้านี้`);
    if (!pkg.is_active && pkg.id !== allowInactiveId) {
      throw new BadRequestException(`แบบบรรจุ "${pkg.brand} ${pkg.pack_unit}" ถูกปิดใช้งานแล้ว`);
    }
    return pkg;
  }

  private packSnapshot(pkg: InventoryProductPackage | null) {
    return {
      package_id: pkg?.id ?? null,
      pack_unit: pkg?.pack_unit ?? null,
      pack_size: pkg?.pack_size ?? null,
    };
  }

  // ----- Lots -----

  // ตั้งยอดยกมา: รับสินค้าเข้าล็อตโดยตรง ไม่ผ่านเอกสาร (ไม่ลงบัญชีการเงิน) — ซื้อของเข้าจริงให้ทำเอกสารรับของเข้า (RCV)
  // เลือกยี่ห้อ/ขนาดบรรจุ (package) แล้วกรอกเป็นหน่วยซื้อ (เช่น 3 กล่อง) → แปลงเป็นหน่วยจ่ายจริงด้วย pack_size ของ package นั้น
  // ยา 1 ตัวต่างยี่ห้อบรรจุไม่เท่ากันได้ (กล่องละ 40 / 50) จึงใช้ pack_size ของ package ไม่ใช่ของสินค้า
  async createLot(dto: CreateInventoryLotDto, currentUser?: string) {
    const product = await this.findOneProduct(dto.product_id);
    const pkg = await this.resolvePackage(this.lotRepo.manager, product.id, dto.package_id);

    let quantity_in = dto.quantity_in;
    let unit_cost = dto.unit_cost;
    let received_pack_qty: number | null = null;

    if (dto.received_pack_qty) {
      if (!pkg) {
        throw new BadRequestException(
          `กรุณาเลือกยี่ห้อ/ขนาดบรรจุ (package_id) ก่อนกรอกจำนวนเป็นหน่วยบรรจุ หรือระบุ quantity_in แทน`,
        );
      }
      received_pack_qty = dto.received_pack_qty;
      quantity_in = dto.received_pack_qty * pkg.pack_size;
      if (dto.pack_unit_cost) {
        unit_cost = Math.round((dto.pack_unit_cost / pkg.pack_size) * 100) / 100;
      }
    }

    if (!quantity_in || quantity_in <= 0) {
      throw new BadRequestException('ต้องระบุจำนวนรับเข้า (quantity_in หรือ received_pack_qty)');
    }

    const lot = this.lotRepo.create({
      ...dto,
      ...this.packSnapshot(pkg),
      brand: pkg ? pkg.brand : dto.brand,
      received_pack_qty,
      quantity_in,
      unit_cost,
      quantity_remaining: quantity_in,
      create_by: currentUser || 'system',
    });
    const saved = await this.lotRepo.save(lot);

    // จำราคาทุน/แพ็คล่าสุดไว้ที่ package เพื่อเติมให้อัตโนมัติครั้งหน้า
    if (pkg && dto.received_pack_qty && dto.pack_unit_cost) {
      await this.lotRepo.manager
        .getRepository(InventoryProductPackage)
        .update(pkg.id, { last_pack_cost: dto.pack_unit_cost });
    }

    await this.movementRepo.save(
      this.movementRepo.create({
        product_lot_id: saved.id,
        movement_type: 'in',
        quantity: quantity_in,
        note: 'รับเข้าสต็อกเริ่มต้น',
      }),
    );

    return saved;
  }

  async findAllLots(query: QueryInventoryLotDto) {
    const { product_id, expiring_before, page = 1, limit = 20 } = query;
    const qb = this.lotRepo
      .createQueryBuilder('lot')
      .leftJoinAndSelect('lot.product', 'product')
      .leftJoinAndSelect('lot.package', 'package');

    if (product_id) qb.andWhere('lot.product_id = :product_id', { product_id });
    if (expiring_before)
      qb.andWhere('lot.expiry_date <= :expiring_before', { expiring_before });

    qb.orderBy('lot.expiry_date', 'ASC', 'NULLS LAST')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    const dataWithLock = await this.attachLockedFlag(data);

    return {
      data: dataWithLock,
      meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
    };
  }

  async findOneLot(id: number) {
    const lot = await this.lotRepo.findOne({ where: { id }, relations: ['product', 'package'] });
    if (!lot) throw new NotFoundException(`ไม่พบล็อตสินค้า ID: ${id}`);
    const [withLock] = await this.attachLockedFlag([lot]);
    return withLock;
  }

  // ประวัติการเคลื่อนไหวของล็อต: แต่ละครั้งมาจากเอกสารไหน ทำอะไร เหลือเท่าไหร่หลังจากนั้น
  //   kind: opening = ตั้งยอดยกมา, document = ตามเอกสาร, reversal = คืนตอนยกเลิกเอกสาร
  async getLotMovements(lotId: number) {
    const lot = await this.findOneLot(lotId);
    const rows: any[] = await this.movementRepo.query(
      `SELECT m.id, m.movement_type, m.quantity, m.moved_date, m.note,
              di.direction AS item_direction, di.item_type,
              d.id AS document_id, d.doc_no, d.doc_type, d.doc_date, d.status, d.void_date, d.void_reason,
              d.supplier, d.reason, pt.first_name, pt.last_name
       FROM inventory_stock_movements m
       LEFT JOIN document_items di ON di.id = m.document_item_id
       LEFT JOIN documents d ON d.id = di.document_id
       LEFT JOIN patients pt ON pt.id = d.patient_id
       WHERE m.product_lot_id = $1
       ORDER BY m.id`,
      [lotId],
    );

    const events = rows.map((r) => {
      const quantity = Number(r.quantity);
      const signed = r.movement_type === 'out' ? -quantity : quantity;
      // ทิศทางปกติของบรรทัดในเอกสาร — ถ้า movement สวนทาง แปลว่าเป็นการคืนตอนยกเลิกเอกสาร
      const normalType = r.item_direction ?? (r.doc_type === 'receive' ? 'in' : 'out');
      const kind = !r.document_id ? 'opening' : r.movement_type !== normalType ? 'reversal' : 'document';
      const party =
        r.doc_type === 'patient_service' && r.first_name
          ? `${r.first_name} ${r.last_name ?? ''}`.trim()
          : (r.supplier ?? r.reason ?? null);
      return {
        id: r.id,
        kind,
        movement_type: r.movement_type,
        quantity: signed,
        // วันที่ทางธุรกิจ: วันที่เอกสาร (หรือวันที่ยกเลิก ถ้าเป็นการคืน) — ไม่ใช่เวลาที่กดบันทึก
        date: kind === 'reversal' ? r.void_date : (r.doc_date ?? r.moved_date),
        moved_date: r.moved_date,
        note: kind === 'reversal' ? (r.void_reason ?? null) : r.note,
        document: r.document_id
          ? { id: r.document_id, doc_no: r.doc_no, doc_type: r.doc_type, status: r.status, party }
          : null,
      };
    });

    // ยอดคงเหลือสะสม ตามลำดับที่เกิดขึ้นจริง (id)
    let balance = 0;
    const withBalance = events.map((e) => ({ ...e, balance: (balance += e.quantity) }));

    return {
      lot: { id: lot.id, lot_no: lot.lot_no, product_name: lot.product?.name, unit: lot.product?.unit,
        quantity_in: Number(lot.quantity_in), quantity_remaining: Number(lot.quantity_remaining) },
      movements: withBalance,
    };
  }

  // ล็อตที่มีเอกสารอ้างอิงแล้ว (รับเข้า/เบิก/บริการ/ปรับยอด) ถือว่า "ล็อก" แก้ไขจำนวน/ต้นทุน/เลขที่ล็อตไม่ได้อีก
  // เพื่อไม่ให้ตัวเลขที่ตัดสต็อก/คำนวณยอดเงินในเอกสารที่ออกไปแล้วไม่ตรงกับ lot ที่แก้ย้อนหลัง
  // นับเฉพาะเอกสารที่ยังใช้งาน — เอกสารที่ยกเลิกแล้วคืนสต็อกไปแล้ว ไม่ต้องล็อกล็อตไว้
  private async isLotLocked(lotId: number): Promise<boolean> {
    const rows = await this.movementRepo.query(
      `SELECT 1 FROM inventory_stock_movements m
       JOIN document_items di ON di.id = m.document_item_id
       JOIN documents d ON d.id = di.document_id
       WHERE m.product_lot_id = $1 AND d.status <> 'void'
       LIMIT 1`,
      [lotId],
    );
    return rows.length > 0;
  }

  private async attachLockedFlag(
    lots: InventoryProductLot[],
  ): Promise<(InventoryProductLot & { is_locked: boolean })[]> {
    if (lots.length === 0) return [];

    const rows: { product_lot_id: number }[] = await this.movementRepo.query(
      `SELECT DISTINCT m.product_lot_id
       FROM inventory_stock_movements m
       JOIN document_items di ON di.id = m.document_item_id
       JOIN documents d ON d.id = di.document_id
       WHERE m.product_lot_id = ANY($1::int[]) AND d.status <> 'void'`,
      [lots.map((l) => l.id)],
    );

    const lockedIds = new Set(rows.map((r) => Number(r.product_lot_id)));
    return lots.map((lot) => ({ ...lot, is_locked: lockedIds.has(lot.id) }));
  }

  // แก้ไข lot ที่มีอยู่ — ถ้ามีเอกสารอ้างอิง lot นี้แล้วจะแก้ไขไม่ได้เลย (ทุก field)
  async updateLot(id: number, dto: UpdateInventoryLotDto, currentUser?: string) {
    const lot = await this.lotRepo.findOne({ where: { id }, relations: ['product'] });
    if (!lot) throw new NotFoundException(`ไม่พบล็อตสินค้า ID: ${id}`);

    if (await this.isLotLocked(id)) {
      throw new BadRequestException(
        `ล็อต "${lot.lot_no}" มีเอกสารอ้างอิงแล้ว ไม่สามารถแก้ไขได้ (ป้องกันไม่ให้ตัวเลขที่ตัดไปแล้วไม่ตรงกับเอกสารที่ออกแล้ว)`,
      );
    }

    let quantity_in = dto.quantity_in ?? lot.quantity_in;
    let unit_cost = dto.unit_cost ?? lot.unit_cost;
    let received_pack_qty = lot.received_pack_qty;

    // package_id ส่งมา = เปลี่ยน (null = ไม่ผูก), ไม่ส่ง = ใช้ของเดิม — ของเดิมที่ถูกปิดใช้งานไปแล้วยังใช้ต่อได้
    const packageChanged = dto.package_id !== undefined && dto.package_id !== lot.package_id;
    const pkg = await this.resolvePackage(
      this.lotRepo.manager,
      lot.product_id,
      dto.package_id !== undefined ? dto.package_id : lot.package_id,
      lot.package_id,
    );

    if (dto.received_pack_qty) {
      if (!pkg) {
        throw new BadRequestException(
          `กรุณาเลือกยี่ห้อ/ขนาดบรรจุ (package_id) ก่อนกรอกจำนวนเป็นหน่วยบรรจุ`,
        );
      }
      // ถ้าไม่ได้เปลี่ยน package ใช้ pack_size ที่ snapshot ไว้ตอนรับเข้า (เผื่อ package ถูกแก้ขนาดภายหลัง)
      const packSize = packageChanged ? pkg.pack_size : (lot.pack_size ?? pkg.pack_size);
      quantity_in = dto.received_pack_qty * packSize;
      received_pack_qty = dto.received_pack_qty;
      if (dto.pack_unit_cost) {
        unit_cost = Math.round((dto.pack_unit_cost / packSize) * 100) / 100;
      }
    } else if (packageChanged && pkg && lot.received_pack_qty && dto.quantity_in === undefined) {
      // เปลี่ยนแค่ยี่ห้อ/ขนาดบรรจุ — จำนวนแพ็คเดิม × ขนาดใหม่
      quantity_in = Number(lot.received_pack_qty) * pkg.pack_size;
    } else if (dto.quantity_in !== undefined || (packageChanged && !pkg)) {
      // เปลี่ยนมากรอกตรงเป็นหน่วยจ่ายจริงแล้ว เคลียร์ค่าหน่วยแพ็คเดิมทิ้งกันข้อมูลค้างไม่ตรงกัน (ต้องเป็น null ไม่ใช่ undefined
      // เพราะ undefined จะถูก TypeORM มองว่า "ไม่ได้แก้ field นี้" แล้วปล่อยค่าเดิมใน DB ไว้เฉยๆ ไม่ clear ให้)
      received_pack_qty = null;
    }

    const packFields = packageChanged
      ? { ...this.packSnapshot(pkg), brand: pkg ? pkg.brand : (dto.brand ?? lot.brand) }
      : { brand: pkg ? lot.brand : (dto.brand ?? lot.brand) };

    // relation ที่โหลดมาจะทับ package_id ตอน save — ตัดทิ้งให้ TypeORM ใช้ค่า package_id ตรงๆ
    delete lot.package;
    Object.assign(lot, dto, packFields, {
      quantity_in,
      quantity_remaining: quantity_in,
      unit_cost,
      received_pack_qty,
      modify_by: currentUser || 'system',
      modify_date: new Date(),
    });

    const saved = await this.lotRepo.save(lot);
    return { ...saved, is_locked: false };
  }

  // ----- Stock mutation ภายใน DB transaction (เรียกจาก DocumentService ด้วย manager เดียวกัน) -----

  // ตัดสต็อกแบบ FEFO (First Expired, First Out) — ข้าม lot อัตโนมัติถ้า lot แรกไม่พอ
  // ข้ามล็อตที่หมดอายุแล้ว ณ asOfDate (วันที่ของเอกสาร) — ห้ามจ่ายยาหมดอายุให้คนไข้โดยไม่ตั้งใจ
  // ล็อตหมดอายุให้ตัดออกด้วยเอกสารปรับยอด (เลือกล็อตตรงๆ ผ่าน deductStockFromLot)
  async deductStockFefo(
    manager: EntityManager,
    productId: number,
    quantity: number,
    documentItemId?: number,
    asOfDate?: string,
  ): Promise<{ product_lot_id: number; quantity: number }[]> {
    const qb = manager
      .getRepository(InventoryProductLot)
      .createQueryBuilder('lot')
      .where('lot.product_id = :productId', { productId })
      .andWhere('lot.quantity_remaining > 0');
    if (asOfDate) {
      qb.andWhere('(lot.expiry_date IS NULL OR lot.expiry_date >= :asOfDate)', { asOfDate });
    }
    const lots = await qb
      .orderBy('lot.expiry_date', 'ASC', 'NULLS LAST')
      .addOrderBy('lot.received_date', 'ASC')
      .setLock('pessimistic_write')
      .getMany();

    let remaining = quantity;
    const deducted: { product_lot_id: number; quantity: number }[] = [];

    for (const lot of lots) {
      if (remaining <= 0) break;
      const take = Math.min(Number(lot.quantity_remaining), remaining);
      lot.quantity_remaining = Number(lot.quantity_remaining) - take;
      await manager.save(lot);

      await manager.save(
        manager.getRepository(InventoryStockMovement).create({
          product_lot_id: lot.id,
          movement_type: 'out',
          quantity: take,
          document_item_id: documentItemId,
        }),
      );

      deducted.push({ product_lot_id: lot.id, quantity: take });
      remaining -= take;
    }

    if (remaining > 0) {
      const product = await manager.getRepository(InventoryProduct).findOne({ where: { id: productId } });
      throw new BadRequestException(
        `สต็อก "${product?.name ?? productId}" ที่ยังไม่หมดอายุไม่พอ (ขาดอีก ${remaining} ${product?.unit ?? 'หน่วย'})`,
      );
    }

    return deducted;
  }

  // ตัดสต็อกจาก lot ที่ผู้ใช้เลือกเองตรงๆ (รวมถึงล็อตหมดอายุ — ใช้ตัดทิ้งในเอกสารปรับยอด)
  async deductStockFromLot(
    manager: EntityManager,
    productLotId: number,
    quantity: number,
    documentItemId?: number,
  ) {
    const lot = await manager.getRepository(InventoryProductLot).findOne({
      where: { id: productLotId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!lot)
      throw new NotFoundException(`ไม่พบล็อตสินค้า ID: ${productLotId}`);
    if (Number(lot.quantity_remaining) < quantity) {
      throw new BadRequestException(
        `ล็อต ${lot.lot_no} คงเหลือไม่พอ (เหลือ ${Number(lot.quantity_remaining)})`,
      );
    }

    lot.quantity_remaining = Number(lot.quantity_remaining) - quantity;
    await manager.save(lot);

    await manager.save(
      manager.getRepository(InventoryStockMovement).create({
        product_lot_id: lot.id,
        movement_type: 'out',
        quantity,
        document_item_id: documentItemId,
      }),
    );
  }

  // เติมสต็อกเข้า lot ที่มีอยู่แล้ว (รับของล็อตเดิมเพิ่ม / ปรับยอดเพิ่ม / ยกเลิกเอกสารที่ตัดไป)
  async addStockToLot(
    manager: EntityManager,
    productLotId: number,
    quantity: number,
    documentItemId?: number,
  ) {
    const lot = await manager.getRepository(InventoryProductLot).findOne({
      where: { id: productLotId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!lot)
      throw new NotFoundException(`ไม่พบล็อตสินค้า ID: ${productLotId}`);

    lot.quantity_remaining = Number(lot.quantity_remaining) + quantity;
    await manager.save(lot);

    await manager.save(
      manager.getRepository(InventoryStockMovement).create({
        product_lot_id: lot.id,
        movement_type: 'in',
        quantity,
        document_item_id: documentItemId,
      }),
    );
  }

  // รับของเข้าจากเอกสาร: ถ้าสินค้านี้มีเลขล็อตเดียวกันอยู่แล้ว → เติมเข้าล็อตเดิม, ไม่มี → สร้างล็อตใหม่
  async receiveIntoLot(
    manager: EntityManager,
    data: {
      product_id: number;
      lot_no: string;
      manufacture_date?: string;
      expiry_date?: string;
      package_id?: number | null;
      received_pack_qty?: number | null;
      quantity_in: number;
      unit_cost?: number;
      brand?: string | null;
      supplier?: string | null;
      received_date?: string;
      note?: string | null;
    },
    documentItemId?: number,
  ): Promise<InventoryProductLot> {
    const existing = await manager
      .getRepository(InventoryProductLot)
      .findOne({ where: { product_id: data.product_id, lot_no: data.lot_no } });
    if (existing) {
      await this.addStockToLot(manager, existing.id, data.quantity_in, documentItemId);
      return existing;
    }

    const pkg = await this.resolvePackage(manager, data.product_id, data.package_id);
    const lot = manager.getRepository(InventoryProductLot).create({
      ...data,
      supplier: data.supplier ?? undefined,
      note: data.note ?? undefined,
      ...this.packSnapshot(pkg),
      brand: pkg?.brand ?? data.brand ?? null,
      received_pack_qty: pkg ? (data.received_pack_qty ?? null) : null,
      quantity_remaining: data.quantity_in,
      create_by: 'document',
    });
    const saved = await manager.save(lot);

    await manager.save(
      manager.getRepository(InventoryStockMovement).create({
        product_lot_id: saved.id,
        movement_type: 'in',
        quantity: data.quantity_in,
        document_item_id: documentItemId,
      }),
    );

    return saved;
  }

  // ใช้ใน DocumentService ตอนแปลงจำนวนแพ็ค → หน่วยย่อย
  async getPackage(manager: EntityManager, productId: number, packageId: number) {
    return this.resolvePackage(manager, productId, packageId);
  }
}
