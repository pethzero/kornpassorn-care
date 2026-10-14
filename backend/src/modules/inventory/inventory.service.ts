import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Not, Repository } from 'typeorm';
import {
  InventoryProduct,
  InventoryProductLot,
  InventoryStockMovement,
} from '../../database/entities/inventory.entity';
import { CreateInventoryProductDto } from './dto/create-inventory-product.dto';
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

  async createProduct(dto: CreateInventoryProductDto, currentUser?: string) {
    const product = this.productRepo.create({
      ...dto,
      create_by: currentUser || 'system',
    });
    return this.productRepo.save(product);
  }

  async findAllProducts(query: QueryInventoryProductDto) {
    const { search, category, is_active, page = 1, limit = 20 } = query;
    const qb = this.productRepo.createQueryBuilder('p');

    if (search) {
      qb.andWhere('(p.name ILIKE :search OR p.sku ILIKE :search)', {
        search: `%${search}%`,
      });
    }
    if (category) qb.andWhere('p.category = :category', { category });
    if (is_active !== undefined)
      qb.andWhere('p.is_active = :is_active', {
        is_active: is_active === 'true',
      });

    qb.orderBy('p.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
    };
  }

  async findOneProduct(id: number) {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException(`ไม่พบสินค้า ID: ${id}`);
    return product;
  }

  async updateProduct(id: number, dto: UpdateInventoryProductDto, currentUser?: string) {
    const product = await this.findOneProduct(id);
    Object.assign(product, dto, { modify_by: currentUser || 'system', modify_date: new Date() });
    return this.productRepo.save(product);
  }

  // ----- Lots -----

  // รับสินค้าเข้าล็อตใหม่โดยตรง (เช่น ตั้งสต็อกเริ่มต้น) นอกเหนือจากการซื้อผ่าน finance transaction
  // รองรับกรอกเป็นหน่วยซื้อ (pack_unit เช่น "กล่อง") แล้วแปลงเป็นหน่วยจ่ายจริง (unit เช่น "เม็ด") ให้อัตโนมัติ
  async createLot(dto: CreateInventoryLotDto, currentUser?: string) {
    const product = await this.findOneProduct(dto.product_id);

    let quantity_in = dto.quantity_in;
    let unit_cost = dto.unit_cost;

    if (dto.received_pack_qty) {
      if (!product.pack_size) {
        throw new BadRequestException(
          `สินค้า "${product.name}" ยังไม่ได้ตั้งค่าหน่วยบรรจุ (pack_unit/pack_size) จึงรับเข้าเป็นแพ็คไม่ได้ กรุณาระบุ quantity_in แทน`,
        );
      }
      quantity_in = dto.received_pack_qty * product.pack_size;
      if (dto.pack_unit_cost) {
        unit_cost = Math.round((dto.pack_unit_cost / product.pack_size) * 100) / 100;
      }
    }

    if (!quantity_in || quantity_in <= 0) {
      throw new BadRequestException('ต้องระบุจำนวนรับเข้า (quantity_in หรือ received_pack_qty)');
    }

    const lot = this.lotRepo.create({
      ...dto,
      quantity_in,
      unit_cost,
      quantity_remaining: quantity_in,
      create_by: currentUser || 'system',
    });
    const saved = await this.lotRepo.save(lot);

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
      .leftJoinAndSelect('lot.product', 'product');

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
    const lot = await this.lotRepo.findOne({ where: { id }, relations: ['product'] });
    if (!lot) throw new NotFoundException(`ไม่พบล็อตสินค้า ID: ${id}`);
    const [withLock] = await this.attachLockedFlag([lot]);
    return withLock;
  }

  // ล็อตที่เคยมีรายการการเงิน (ขาย/ซื้อ) อ้างอิงแล้วถือว่า "ล็อก" แก้ไขจำนวน/ต้นทุน/เลขที่ล็อตไม่ได้อีก
  // เพื่อไม่ให้ตัวเลขที่ตัดสต็อก/คำนวณยอดเงินในเอกสารที่ออกไปแล้วไม่ตรงกับ lot ที่แก้ย้อนหลัง
  private async isLotLocked(lotId: number): Promise<boolean> {
    const count = await this.movementRepo.count({
      where: { product_lot_id: lotId, finance_transaction_item_id: Not(IsNull()) },
    });
    return count > 0;
  }

  private async attachLockedFlag(
    lots: InventoryProductLot[],
  ): Promise<(InventoryProductLot & { is_locked: boolean })[]> {
    if (lots.length === 0) return [];

    const rows = await this.movementRepo
      .createQueryBuilder('m')
      .select('DISTINCT m.product_lot_id', 'product_lot_id')
      .where('m.product_lot_id IN (:...ids)', { ids: lots.map((l) => l.id) })
      .andWhere('m.finance_transaction_item_id IS NOT NULL')
      .getRawMany<{ product_lot_id: number }>();

    const lockedIds = new Set(rows.map((r) => Number(r.product_lot_id)));
    return lots.map((lot) => ({ ...lot, is_locked: lockedIds.has(lot.id) }));
  }

  // แก้ไข lot ที่มีอยู่ — ถ้ามีรายการการเงินอ้างอิง lot นี้แล้วจะแก้ไขไม่ได้เลย (ทุก field)
  async updateLot(id: number, dto: UpdateInventoryLotDto, currentUser?: string) {
    const lot = await this.lotRepo.findOne({ where: { id }, relations: ['product'] });
    if (!lot) throw new NotFoundException(`ไม่พบล็อตสินค้า ID: ${id}`);

    if (await this.isLotLocked(id)) {
      throw new BadRequestException(
        `ล็อต "${lot.lot_no}" มีรายการการเงินอ้างอิงแล้ว ไม่สามารถแก้ไขได้ (ป้องกันไม่ให้ตัวเลขที่ตัดไปแล้วไม่ตรงกับเอกสารที่ออกแล้ว)`,
      );
    }

    let quantity_in = dto.quantity_in ?? lot.quantity_in;
    let unit_cost = dto.unit_cost ?? lot.unit_cost;
    let received_pack_qty = lot.received_pack_qty;

    if (dto.received_pack_qty) {
      if (!lot.product.pack_size) {
        throw new BadRequestException(
          `สินค้า "${lot.product.name}" ยังไม่ได้ตั้งค่าหน่วยบรรจุ (pack_unit/pack_size) จึงรับเข้าเป็นแพ็คไม่ได้`,
        );
      }
      quantity_in = dto.received_pack_qty * lot.product.pack_size;
      received_pack_qty = dto.received_pack_qty;
      if (dto.pack_unit_cost) {
        unit_cost = Math.round((dto.pack_unit_cost / lot.product.pack_size) * 100) / 100;
      }
    } else if (dto.quantity_in !== undefined) {
      // เปลี่ยนมากรอกตรงเป็นหน่วยจ่ายจริงแล้ว เคลียร์ค่าหน่วยแพ็คเดิมทิ้งกันข้อมูลค้างไม่ตรงกัน (ต้องเป็น null ไม่ใช่ undefined
      // เพราะ undefined จะถูก TypeORM มองว่า "ไม่ได้แก้ field นี้" แล้วปล่อยค่าเดิมใน DB ไว้เฉยๆ ไม่ clear ให้)
      received_pack_qty = null;
    }

    Object.assign(lot, dto, {
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

  // ----- Stock mutation ภายใน DB transaction (เรียกจาก FinanceTransactionService ด้วย manager เดียวกัน) -----

  // ตัดสต็อกแบบ FEFO (First Expired, First Out) — ข้าม lot อัตโนมัติถ้า lot แรกไม่พอ
  async deductStockFefo(
    manager: EntityManager,
    productId: number,
    quantity: number,
    financeTransactionItemId?: number,
  ): Promise<{ product_lot_id: number; quantity: number }[]> {
    const lots = await manager
      .getRepository(InventoryProductLot)
      .createQueryBuilder('lot')
      .where('lot.product_id = :productId', { productId })
      .andWhere('lot.quantity_remaining > 0')
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
          finance_transaction_item_id: financeTransactionItemId,
        }),
      );

      deducted.push({ product_lot_id: lot.id, quantity: take });
      remaining -= take;
    }

    if (remaining > 0) {
      throw new BadRequestException(
        `สต็อกสินค้า ID ${productId} ไม่พอ (ขาดอีก ${remaining} หน่วย)`,
      );
    }

    return deducted;
  }

  // ตัดสต็อกจาก lot ที่ผู้ใช้เลือกเองตรงๆ
  async deductStockFromLot(
    manager: EntityManager,
    productLotId: number,
    quantity: number,
    financeTransactionItemId?: number,
  ) {
    const lot = await manager.getRepository(InventoryProductLot).findOne({
      where: { id: productLotId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!lot)
      throw new NotFoundException(`ไม่พบล็อตสินค้า ID: ${productLotId}`);
    if (Number(lot.quantity_remaining) < quantity) {
      throw new BadRequestException(
        `ล็อต ${lot.lot_no} คงเหลือไม่พอ (เหลือ ${lot.quantity_remaining})`,
      );
    }

    lot.quantity_remaining = Number(lot.quantity_remaining) - quantity;
    await manager.save(lot);

    await manager.save(
      manager.getRepository(InventoryStockMovement).create({
        product_lot_id: lot.id,
        movement_type: 'out',
        quantity,
        finance_transaction_item_id: financeTransactionItemId,
      }),
    );
  }

  // เติมสต็อกเข้า lot ที่มีอยู่แล้ว (restock ของเดิม)
  async addStockToLot(
    manager: EntityManager,
    productLotId: number,
    quantity: number,
    financeTransactionItemId?: number,
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
        finance_transaction_item_id: financeTransactionItemId,
      }),
    );
  }

  // สร้าง lot ใหม่พร้อมกับการซื้อเข้า (เรียกจาก FinanceTransactionService เมื่อ item ระบุ new_lot)
  async createLotInTransaction(
    manager: EntityManager,
    data: {
      product_id: number;
      lot_no: string;
      manufacture_date?: string;
      expiry_date?: string;
      quantity_in: number;
      unit_cost?: number;
    },
    financeTransactionItemId?: number,
  ): Promise<InventoryProductLot> {
    const lot = manager.getRepository(InventoryProductLot).create({
      ...data,
      quantity_remaining: data.quantity_in,
    });
    const saved = await manager.save(lot);

    await manager.save(
      manager.getRepository(InventoryStockMovement).create({
        product_lot_id: saved.id,
        movement_type: 'in',
        quantity: data.quantity_in,
        finance_transaction_item_id: financeTransactionItemId,
      }),
    );

    return saved;
  }
}
