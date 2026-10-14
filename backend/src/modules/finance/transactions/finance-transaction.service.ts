import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  FinanceTransaction,
  FinanceTransactionItem,
} from '../../../database/entities/finance-transaction.entity';
import { InventoryStockMovement } from '../../../database/entities/inventory.entity';
import { InventoryService } from '../../inventory/inventory.service';
import { CreateFinanceTransactionDto } from './dto/create-finance-transaction.dto';
import { QueryFinanceTransactionDto } from './dto/query-finance-transaction.dto';

@Injectable()
export class FinanceTransactionService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(FinanceTransaction)
    private readonly transactionRepo: Repository<FinanceTransaction>,
    private readonly inventoryService: InventoryService,
  ) {}

  // เลขที่เอกสารรันต่อปี เช่น "FN2026-00001" — ใช้ ON CONFLICT upsert ให้ atomic ไม่ชนกันตอนสร้างพร้อมกัน
  private async generateDocNo(manager: EntityManager): Promise<string> {
    const year = new Date().getFullYear();
    const rows = await manager.query(
      `INSERT INTO finance_doc_sequences (doc_year, last_number) VALUES ($1, 1)
       ON CONFLICT (doc_year) DO UPDATE SET last_number = finance_doc_sequences.last_number + 1
       RETURNING last_number`,
      [year],
    );
    const seq = rows[0].last_number as number;
    return `FN${year}-${String(seq).padStart(5, '0')}`;
  }

  // สร้างเอกสารการเงิน 1 ใบ พร้อมรายการย่อย — ตัด/เติมสต็อกสินค้าในรายการที่เป็น item_type='product'
  // ทั้งหมดอยู่ใน DB transaction เดียวกัน ถ้าขั้นใดพลาด (เช่น สต็อกไม่พอ) จะ rollback ทั้งใบ
  async create(
    dto: CreateFinanceTransactionDto,
    currentUser?: string,
  ): Promise<FinanceTransaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let createdId: number;

    if (dto.doc_type === 'patient_service' && !dto.patient_id) {
      throw new BadRequestException('กรุณาเลือกคนไข้สำหรับเอกสารบริการคนไข้');
    }

    try {
      const manager = queryRunner.manager;
      const doc_no = await this.generateDocNo(manager);

      let header = manager.getRepository(FinanceTransaction).create({
        doc_no,
        doc_type: dto.doc_type,
        doc_date: dto.doc_date,
        note: dto.note,
        patient_id: dto.patient_id,
        create_by: currentUser || 'system',
      });
      header = await manager.save(header);

      let total_in = 0;
      let total_out = 0;

      for (let i = 0; i < dto.items.length; i++) {
        const itemDto = dto.items[i];

        let item = manager.getRepository(FinanceTransactionItem).create({
          transaction_id: header.id,
          line_no: i + 1,
          direction: itemDto.direction,
          category: itemDto.category,
          item_type: itemDto.item_type || 'other',
          product_id: itemDto.product_id,
          product_lot_id: itemDto.product_lot_id,
          quantity: itemDto.quantity,
          unit_price: itemDto.unit_price,
          amount: itemDto.amount,
          description: itemDto.description,
          ref_type: itemDto.ref_type,
          ref_id: itemDto.ref_id,
        });
        item = await manager.save(item);

        if (itemDto.item_type === 'product' && itemDto.product_id) {
          if (!itemDto.quantity || itemDto.quantity <= 0) {
            throw new BadRequestException(
              `บรรทัดที่ ${i + 1}: ต้องระบุจำนวน (quantity) เมื่อ item_type เป็น product`,
            );
          }

          if (itemDto.direction === 'out') {
            if (itemDto.product_lot_id) {
              await this.inventoryService.deductStockFromLot(
                manager,
                itemDto.product_lot_id,
                itemDto.quantity,
                item.id,
              );
            } else {
              // FEFO: อาจตัดข้ามหลายล็อต — เก็บล็อตแรกที่ถูกตัดไว้ที่ item.product_lot_id เพื่อแสดงผล
              // ส่วนรายละเอียดการตัดครบทุกล็อตดูได้จาก inventory_stock_movements (finance_transaction_item_id)
              const deducted = await this.inventoryService.deductStockFefo(
                manager,
                itemDto.product_id,
                itemDto.quantity,
                item.id,
              );
              item.product_lot_id = deducted[0]?.product_lot_id;
              await manager.save(item);
            }
          } else if (itemDto.direction === 'in') {
            if (itemDto.new_lot) {
              const lot = await this.inventoryService.createLotInTransaction(
                manager,
                {
                  product_id: itemDto.product_id,
                  lot_no: itemDto.new_lot.lot_no,
                  manufacture_date: itemDto.new_lot.manufacture_date,
                  expiry_date: itemDto.new_lot.expiry_date,
                  quantity_in: itemDto.quantity,
                  unit_cost: itemDto.unit_price,
                },
                item.id,
              );
              item.product_lot_id = lot.id;
              await manager.save(item);
            } else if (itemDto.product_lot_id) {
              await this.inventoryService.addStockToLot(
                manager,
                itemDto.product_lot_id,
                itemDto.quantity,
                item.id,
              );
            }
            // ถ้าไม่ระบุ new_lot และไม่ระบุ product_lot_id: เป็นรายรับที่เกี่ยวกับสินค้าแต่ไม่ต้องกระทบสต็อก (เช่น ส่วนลด/ค่าธรรมเนียม)
          }
        }

        if (itemDto.direction === 'in') total_in += Number(itemDto.amount);
        else total_out += Number(itemDto.amount);
      }

      header.total_in = total_in;
      header.total_out = total_out;
      header.net_amount = total_in - total_out;
      await manager.save(header);

      createdId = header.id;
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    return this.findOne(createdId);
  }

  async findAll(query: QueryFinanceTransactionDto) {
    const {
      doc_type,
      status,
      start_date,
      end_date,
      search,
      patient_id,
      page = 1,
      limit = 10,
      sort_by = 'doc_date',
      sort_order = 'DESC',
    } = query;

    const qb = this.transactionRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.patient', 'patient');

    if (doc_type) qb.andWhere('t.doc_type = :doc_type', { doc_type });
    if (status) qb.andWhere('t.status = :status', { status });
    if (patient_id) qb.andWhere('t.patient_id = :patient_id', { patient_id });

    if (start_date && end_date) {
      qb.andWhere('t.doc_date BETWEEN :start_date AND :end_date', {
        start_date,
        end_date,
      });
    } else if (start_date) {
      qb.andWhere('t.doc_date >= :start_date', { start_date });
    } else if (end_date) {
      qb.andWhere('t.doc_date <= :end_date', { end_date });
    }

    if (search) {
      qb.andWhere('(t.doc_no ILIKE :search OR t.note ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    qb.orderBy(`t.${sort_by}`, sort_order)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
    };
  }

  // สรุปยอดเงินรับ/จ่าย/สุทธิ ของวันนี้ และของปีปัจจุบัน (ไม่รวมเอกสารที่ถูกยกเลิก)
  // ใช้ CURRENT_DATE ฝั่ง DB แทนวันที่จาก Node เพื่อให้ตรงกับ timezone ของ DB ที่ใช้บันทึก doc_date จริง
  async getSummary() {
    const buildQuery = () =>
      this.transactionRepo
        .createQueryBuilder('t')
        .select('COALESCE(SUM(t.total_in), 0)', 'total_in')
        .addSelect('COALESCE(SUM(t.total_out), 0)', 'total_out')
        .addSelect('COALESCE(SUM(t.net_amount), 0)', 'net_amount')
        .addSelect('COUNT(*)', 'count')
        .where("t.status != 'void'");

    const [todayRow, yearRow] = await Promise.all([
      buildQuery().andWhere('t.doc_date = CURRENT_DATE').getRawOne(),
      buildQuery()
        .andWhere('EXTRACT(YEAR FROM t.doc_date) = EXTRACT(YEAR FROM CURRENT_DATE)')
        .getRawOne(),
    ]);

    const toSummary = (row: any) => ({
      total_in: Number(row.total_in),
      total_out: Number(row.total_out),
      net_amount: Number(row.net_amount),
      count: Number(row.count),
    });

    return {
      today: toSummary(todayRow),
      year: { ...toSummary(yearRow), year: new Date().getFullYear() },
    };
  }

  async findOne(id: number): Promise<FinanceTransaction> {
    const transaction = await this.transactionRepo.findOne({
      where: { id },
      relations: ['items', 'items.product', 'items.product_lot', 'patient'],
      order: { items: { line_no: 'ASC' } },
    });
    if (!transaction)
      throw new NotFoundException(`ไม่พบเอกสารการเงิน ID: ${id}`);
    return transaction;
  }

  // ยกเลิกเอกสาร — ย้อนสต็อกทุกการตัด/เติมที่เกิดจากรายการในเอกสารนี้กลับคืน (อ้างอิงจาก inventory_stock_movements ตรง)
  async voidTransaction(
    id: number,
    currentUser?: string,
  ): Promise<FinanceTransaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const manager = queryRunner.manager;
      const transaction = await manager
        .getRepository(FinanceTransaction)
        .findOne({
          where: { id },
          relations: ['items'],
        });
      if (!transaction)
        throw new NotFoundException(`ไม่พบเอกสารการเงิน ID: ${id}`);
      if (transaction.status === 'void')
        throw new BadRequestException('เอกสารนี้ถูกยกเลิกไปแล้ว');

      for (const item of transaction.items) {
        const movements = await manager
          .getRepository(InventoryStockMovement)
          .find({
            where: { finance_transaction_item_id: item.id },
          });

        for (const movement of movements) {
          if (movement.movement_type === 'out') {
            // ตอนตัดสต็อกไปคือ out -> ยกเลิกแล้วคืนกลับเป็นเติม (in) เท่าจำนวนเดิม
            await this.inventoryService.addStockToLot(
              manager,
              movement.product_lot_id,
              Number(movement.quantity),
              item.id,
            );
          } else if (movement.movement_type === 'in') {
            // ตอนรับเข้าคือ in -> ยกเลิกแล้วต้องตัดออกเท่าจำนวนเดิม (ถ้าสต็อกถูกใช้ไปแล้วจะ throw ให้ผู้ใช้จัดการเอง)
            await this.inventoryService.deductStockFromLot(
              manager,
              movement.product_lot_id,
              Number(movement.quantity),
              item.id,
            );
          }
        }
      }

      transaction.status = 'void';
      transaction.modify_by = currentUser || 'system';
      await manager.save(transaction);

      await queryRunner.commitTransaction();
      return transaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
