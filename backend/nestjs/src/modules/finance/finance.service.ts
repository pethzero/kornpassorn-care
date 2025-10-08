import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like } from 'typeorm';
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
      console.log('www')
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
      sort_by = 'create_date',
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

    // Search in item_name
    if (search) {
      queryBuilder.andWhere('finance.item_name ILIKE :search', { 
        search: `%${search}%` 
      });
    }

    // Sorting
    queryBuilder.orderBy(`finance.${sort_by}`, sort_order);

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

  // สรุปยอดรายได้/รายจ่าย
  async getSummary(start_date?: string, end_date?: string) {
    const queryBuilder = this.financeRepository.createQueryBuilder('finance');

    // Filter by date range
    if (start_date && end_date) {
      queryBuilder.andWhere('finance.record_date BETWEEN :start_date AND :end_date', {
        start_date,
        end_date,
      });
    }

    const summary = await queryBuilder
      .select('finance.category', 'category')
      .addSelect('COUNT(finance.id)', 'count')
      .addSelect('SUM(finance.amount)', 'total_amount')
      .addSelect('AVG(finance.amount)', 'average_amount')
      .groupBy('finance.category')
      .getRawMany();

    const income = summary.find(s => s.category === 'income') || { count: 0, total_amount: 0, average_amount: 0 };
    const expense = summary.find(s => s.category === 'expense') || { count: 0, total_amount: 0, average_amount: 0 };

    return {
      income: {
        count: parseInt(income.count),
        total: parseFloat(income.total_amount) || 0,
        average: parseFloat(income.average_amount) || 0,
      },
      expense: {
        count: parseInt(expense.count),
        total: parseFloat(expense.total_amount) || 0,
        average: parseFloat(expense.average_amount) || 0,
      },
      net_income: (parseFloat(income.total_amount) || 0) - (parseFloat(expense.total_amount) || 0),
      date_range: {
        start_date: start_date || null,
        end_date: end_date || null,
      },
    };
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
