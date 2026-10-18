import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { FinanceRecord } from '../../database/entities/finance-record.entity';
import { CreateFinanceRecordDto } from './dto/create-finance-record.dto';
import { UpdateFinanceRecordDto } from './dto/update-finance-record.dto';
import { QueryFinanceRecordDto } from './dto/query-finance-record.dto';

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(FinanceRecord)
    private financeRepository: Repository<FinanceRecord>,
  ) {}

  // สร้างรายการใหม่
  async create(createFinanceRecordDto: CreateFinanceRecordDto, currentUser?: string): Promise<FinanceRecord> {
    try {
      const financeRecord = this.financeRepository.create({
        ...createFinanceRecordDto,
        record_date: new Date(createFinanceRecordDto.record_date),
        create_by: currentUser || 'system',
        // create_date จะถูกตั้งค่าอัตโนมัติจาก @CreateDateColumn
      });
      
      return await this.financeRepository.save(financeRecord);
    } catch (error) {
      throw new BadRequestException('ไม่สามารถสร้างรายการการเงินได้');
    }
  }

  // ดึงข้อมูลทั้งหมด (พร้อม pagination และ filter)
  async findAll(query: QueryFinanceRecordDto) {
    const {
      category,
      start_date,
      end_date,
      page = 1,
      limit = 10,
      search,
      source,
      sort_by = 'record_date',
      sort_order = 'DESC'
    } = query;

    const queryBuilder = this.financeRepository.createQueryBuilder('finance');

    // Filter by category
    if (category) {
      queryBuilder.andWhere('finance.category = :category', { category });
    }

    // Filter by date range
    if (start_date && end_date) {
      queryBuilder.andWhere('finance.record_date BETWEEN :start_date AND :end_date', {
        start_date,
        end_date,
      });
    } else if (start_date) {
      queryBuilder.andWhere('finance.record_date >= :start_date', { start_date });
    } else if (end_date) {
      queryBuilder.andWhere('finance.record_date <= :end_date', { end_date });
    }

    if (source === 'document') queryBuilder.andWhere('finance.document_id IS NOT NULL');
    if (source === 'manual') queryBuilder.andWhere('finance.document_id IS NULL');

    // ค้นในชื่อรายการ / รายละเอียด / เลขที่เอกสาร
    if (search) {
      queryBuilder.andWhere(
        '(finance.item_name ILIKE :search OR finance.description ILIKE :search OR document.doc_no ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Sorting — วันที่เดียวกันเรียงตามที่บันทึกทีหลังขึ้นก่อน
    queryBuilder.orderBy(`finance.${sort_by}`, sort_order).addOrderBy('finance.id', 'DESC');

    // Pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [records, total] = await queryBuilder.getManyAndCount();

    return {
      data: records,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
        has_next: page * limit < total,
        has_prev: page > 1,
      },
    };
  }

  // ดึงข้อมูลตาม ID
  async findOne(id: number): Promise<FinanceRecord> {
    const record = await this.financeRepository.findOne({ where: { id } });
    
    if (!record) {
      throw new NotFoundException(`ไม่พบรายการการเงิน ID: ${id}`);
    }
    
    return record;
  }

  // อัปเดตข้อมูล
  async update(id: number, updateFinanceRecordDto: UpdateFinanceRecordDto, currentUser?: string): Promise<FinanceRecord> {
    const record = await this.findOne(id);
    
    const updateData: any = { ...updateFinanceRecordDto };
    if (updateFinanceRecordDto.record_date) {
      updateData.record_date = new Date(updateFinanceRecordDto.record_date);
    }
    
    // เพิ่มข้อมูลผู้แก้ไข
    updateData.modify_by = currentUser || 'system';
    // modify_date จะถูกตั้งค่าอัตโนมัติจาก @UpdateDateColumn

    Object.assign(record, updateData);
    
    try {
      return await this.financeRepository.save(record);
    } catch (error) {
      throw new BadRequestException('ไม่สามารถอัปเดตรายการการเงินได้');
    }
  }

  // ลบข้อมูล
  async remove(id: number): Promise<{ message: string }> {
    const record = await this.findOne(id);
    
    try {
      await this.financeRepository.remove(record);
      return { message: `ลบรายการการเงิน ID: ${id} เรียบร้อยแล้ว` };
    } catch (error) {
      throw new BadRequestException('ไม่สามารถลบรายการการเงินได้');
    }
  }

  // สรุปยอดรายรับ/รายจ่ายในช่วงวันที่ + แยกที่มา (จากเอกสารประเภทไหน / บันทึกเอง) + รายจ่ายที่บันทึกเองสูงสุด
  async getSummary(start_date?: string, end_date?: string) {
    const applyRange = (qb: SelectQueryBuilder<FinanceRecord>) => {
      if (start_date) qb.andWhere('finance.record_date >= :start_date', { start_date });
      if (end_date) qb.andWhere('finance.record_date <= :end_date', { end_date });
      return qb;
    };

    const totals = await applyRange(this.financeRepository.createQueryBuilder('finance'))
      .select('finance.category', 'category')
      .addSelect('COUNT(finance.id)', 'count')
      .addSelect('COALESCE(SUM(finance.amount), 0)', 'total')
      .groupBy('finance.category')
      .getRawMany<{ category: string; count: string; total: string }>();

    // source: ประเภทเอกสาร (receive / patient_service) หรือ 'manual'
    const bySource = await applyRange(
      this.financeRepository.createQueryBuilder('finance').leftJoin('finance.document', 'document'),
    )
      .select('finance.category', 'category')
      .addSelect("COALESCE(document.doc_type, 'manual')", 'source')
      .addSelect('COUNT(finance.id)', 'count')
      .addSelect('COALESCE(SUM(finance.amount), 0)', 'total')
      .groupBy('finance.category')
      .addGroupBy('source')
      .orderBy('total', 'DESC')
      .getRawMany<{ category: string; source: string; count: string; total: string }>();

    const topManualExpenses = await applyRange(this.financeRepository.createQueryBuilder('finance'))
      .select('finance.item_name', 'item_name')
      .addSelect('COUNT(finance.id)', 'count')
      .addSelect('SUM(finance.amount)', 'total')
      .andWhere("finance.category = 'expense'")
      .andWhere('finance.document_id IS NULL')
      .groupBy('finance.item_name')
      .orderBy('total', 'DESC')
      .limit(5)
      .getRawMany<{ item_name: string; count: string; total: string }>();

    // รายรับแยกตามบริการ: จากรายการในเอกสารบริการคนไข้ (บริการ = ชื่อบริการ, สินค้า = "ยา/เวชภัณฑ์") + รายรับที่บันทึกเอง
    const docParams: any[] = [];
    let docRange = '';
    if (start_date) {
      docParams.push(start_date);
      docRange += ` AND d.doc_date >= $${docParams.length}`;
    }
    if (end_date) {
      docParams.push(end_date);
      docRange += ` AND d.doc_date <= $${docParams.length}`;
    }
    const serviceRows: { label: string; kind: string; docs: string; total: string }[] =
      await this.financeRepository.query(
        `SELECT CASE WHEN di.item_type = 'product' THEN 'ยา/เวชภัณฑ์ที่ใช้'
                     ELSE COALESCE(NULLIF(di.category, ''), di.description, 'บริการอื่นๆ') END AS label,
                CASE WHEN di.item_type = 'product' THEN 'product' ELSE 'service' END AS kind,
                COUNT(DISTINCT d.id) AS docs,
                SUM(di.amount) AS total
         FROM document_items di
         JOIN documents d ON d.id = di.document_id
         WHERE d.status = 'confirmed' AND d.doc_type = 'patient_service' ${docRange}
         GROUP BY 1, 2
         HAVING SUM(di.amount) > 0
         ORDER BY total DESC`,
        docParams,
      );
    const visitRow: { visits: string; patients: string }[] = await this.financeRepository.query(
      `SELECT COUNT(*) AS visits, COUNT(DISTINCT d.patient_id) AS patients
       FROM documents d
       WHERE d.status = 'confirmed' AND d.doc_type = 'patient_service' ${docRange}`,
      docParams,
    );
    const manualIncome = await applyRange(this.financeRepository.createQueryBuilder('finance'))
      .select('finance.item_name', 'item_name')
      .addSelect('COUNT(finance.id)', 'count')
      .addSelect('SUM(finance.amount)', 'total')
      .andWhere("finance.category = 'income'")
      .andWhere('finance.document_id IS NULL')
      .groupBy('finance.item_name')
      .orderBy('total', 'DESC')
      .getRawMany<{ item_name: string; count: string; total: string }>();

    const pick = (category: string) => {
      const row = totals.find((t) => t.category === category);
      const count = Number(row?.count ?? 0);
      const total = Number(row?.total ?? 0);
      return { count, total, average: count ? Math.round((total / count) * 100) / 100 : 0 };
    };
    const income = pick('income');
    const expense = pick('expense');

    return {
      income,
      expense,
      net_income: income.total - expense.total,
      by_source: bySource.map((r) => ({
        category: r.category as 'income' | 'expense',
        source: r.source,
        count: Number(r.count),
        total: Number(r.total),
      })),
      top_manual_expenses: topManualExpenses.map((r) => ({
        item_name: r.item_name,
        count: Number(r.count),
        total: Number(r.total),
      })),
      income_breakdown: [
        ...serviceRows.map((r) => ({
          label: r.label,
          kind: r.kind as 'service' | 'product',
          count: Number(r.docs),
          total: Number(r.total),
        })),
        ...manualIncome.map((r) => ({
          label: r.item_name,
          kind: 'manual' as const,
          count: Number(r.count),
          total: Number(r.total),
        })),
      ].sort((a, b) => b.total - a.total),
      service_stats: {
        visits: Number(visitRow[0]?.visits ?? 0),
        patients: Number(visitRow[0]?.patients ?? 0),
      },
      date_range: { start_date: start_date || null, end_date: end_date || null },
    };
  }

  // แนวโน้มรายรับ/รายจ่ายในช่วงวันที่ — รวมเป็นรายวันหรือรายเดือน (ช่วงที่ไม่มีรายการได้ 0 เพื่อให้กราฟต่อเนื่อง)
  async getTrend(start_date: string, end_date: string, granularity: 'day' | 'month') {
    if (!start_date || !end_date) throw new BadRequestException('ต้องระบุ start_date และ end_date');
    const g = granularity === 'day' ? 'day' : 'month';
    const days = (new Date(end_date).getTime() - new Date(start_date).getTime()) / 86400000;
    if (days < 0) throw new BadRequestException('วันที่เริ่มต้องไม่เกินวันที่สิ้นสุด');
    // กันกราฟยาวเกินอ่าน: รายวันไม่เกิน ~3 เดือน, รายเดือนไม่เกิน 5 ปี
    if ((g === 'day' && days > 93) || (g === 'month' && days > 366 * 5)) {
      throw new BadRequestException('ช่วงวันที่ยาวเกินไปสำหรับการแสดงผลแบบนี้');
    }
    const fmt = g === 'day' ? 'YYYY-MM-DD' : 'YYYY-MM';
    const rows: { bucket: string; income: string; expense: string }[] = await this.financeRepository.query(
      `SELECT to_char(b.bucket, '${fmt}') AS bucket,
              COALESCE(SUM(f.amount) FILTER (WHERE f.category = 'income'), 0)  AS income,
              COALESCE(SUM(f.amount) FILTER (WHERE f.category = 'expense'), 0) AS expense
       FROM generate_series(date_trunc('${g}', $1::date), date_trunc('${g}', $2::date), interval '1 ${g}') AS b(bucket)
       LEFT JOIN finance_records f
         ON date_trunc('${g}', f.record_date) = b.bucket AND f.record_date BETWEEN $1::date AND $2::date
       GROUP BY b.bucket
       ORDER BY b.bucket`,
      [start_date, end_date],
    );
    return rows.map((r) => {
      const income = Number(r.income);
      const expense = Number(r.expense);
      return { bucket: r.bucket, income, expense, net: income - expense };
    });
  }

  // รายรับ/รายจ่ายรายเดือน ย้อนหลัง N เดือน (รวมเดือนปัจจุบัน) — เดือนที่ไม่มีรายการได้ 0 เพื่อให้กราฟต่อเนื่อง
  async getMonthlyReport(months = 6) {
    const n = Math.min(Math.max(Math.floor(months), 1), 24);
    const rows: { month: string; income: string; expense: string }[] = await this.financeRepository.query(
      `SELECT to_char(m.month, 'YYYY-MM') AS month,
              COALESCE(SUM(f.amount) FILTER (WHERE f.category = 'income'), 0)  AS income,
              COALESCE(SUM(f.amount) FILTER (WHERE f.category = 'expense'), 0) AS expense
       FROM generate_series(date_trunc('month', CURRENT_DATE) - ($1::int - 1) * interval '1 month',
                            date_trunc('month', CURRENT_DATE), interval '1 month') AS m(month)
       LEFT JOIN finance_records f ON date_trunc('month', f.record_date) = m.month
       GROUP BY m.month
       ORDER BY m.month`,
      [n],
    );
    return rows.map((r) => {
      const income = Number(r.income);
      const expense = Number(r.expense);
      return { month: r.month, income, expense, net: income - expense };
    });
  }

  // รายงานรายวัน
  async getDailyReport(start_date?: string, end_date?: string) {
    const queryBuilder = this.financeRepository.createQueryBuilder('finance');

    if (start_date && end_date) {
      queryBuilder.andWhere('finance.record_date BETWEEN :start_date AND :end_date', {
        start_date,
        end_date,
      });
    }

    const dailyReport = await queryBuilder
      .select('finance.record_date', 'date')
      .addSelect('finance.category', 'category')
      .addSelect('COUNT(finance.id)', 'count')
      .addSelect('SUM(finance.amount)', 'total_amount')
      .groupBy('finance.record_date, finance.category')
      .orderBy('finance.record_date', 'DESC')
      .getRawMany();

    // Group by date
    const groupedReport = dailyReport.reduce((acc, item) => {
      const date = item.date;
      if (!acc[date]) {
        acc[date] = {
          date,
          income: { count: 0, total: 0 },
          expense: { count: 0, total: 0 },
          net: 0,
        };
      }
      
      if (item.category === 'income') {
        acc[date].income = {
          count: parseInt(item.count),
          total: parseFloat(item.total_amount),
        };
      } else {
        acc[date].expense = {
          count: parseInt(item.count),
          total: parseFloat(item.total_amount),
        };
      }
      
      acc[date].net = acc[date].income.total - acc[date].expense.total;
      
      return acc;
    }, {});

    return Object.values(groupedReport);
  }
}
