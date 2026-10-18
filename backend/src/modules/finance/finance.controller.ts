import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { CreateFinanceRecordDto } from './dto/create-finance-record.dto';
import { UpdateFinanceRecordDto } from './dto/update-finance-record.dto';
import { QueryFinanceRecordDto } from './dto/query-finance-record.dto';
import { JwtAuthGuard } from '../auth/guards';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

// บัญชีการเงินเป็นข้อมูลภายใน — เฉพาะเจ้าหน้าที่ (เดิมมีแค่ JwtAuthGuard ทำให้ guest/คนไข้ที่ login อยู่เรียกได้ด้วย)
@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('user', 'admin')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) { }

  // POST /api/finance - สร้างรายการการเงินใหม่
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createFinanceRecordDto: CreateFinanceRecordDto,
    @Request() req: any,
  ) {
    const currentUser = req.user?.username || req.user?.email || 'anonymous';
    const result = await this.financeService.create(createFinanceRecordDto, currentUser);
    return {
      success: true,
      message: 'สร้างรายการการเงินเรียบร้อยแล้ว',
      data: result,
    };
  }

  // GET /api/finance - ดึงข้อมูลทั้งหมด (พร้อม pagination และ filter)
  @Get()
  async findAll(@Query() query: QueryFinanceRecordDto) {
    const result = await this.financeService.findAll(query);
    return {
      success: true,
      message: 'ดึงข้อมูลรายการการเงินเรียบร้อยแล้ว',
      ...result,
    };
  }

  // GET /api/finance/summary - สรุปยอดรายได้/รายจ่าย
  @Get('summary')
  async getSummary(
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
  ) {
    const result = await this.financeService.getSummary(start_date, end_date);
    return {
      success: true,
      message: 'ดึงข้อมูลสรุปการเงินเรียบร้อยแล้ว',
      data: result,
    };
  }

  // GET /api/finance/reports/trend?start_date=&end_date=&granularity=day|month
  @Get('reports/trend')
  async getTrend(
    @Query('start_date') start_date: string,
    @Query('end_date') end_date: string,
    @Query('granularity') granularity?: string,
  ) {
    const data = await this.financeService.getTrend(start_date, end_date, granularity === 'day' ? 'day' : 'month');
    return { success: true, data };
  }

  // GET /api/finance/reports/monthly?months=6 - รายรับ/รายจ่ายรายเดือน (รวมเดือนที่ไม่มีรายการเป็น 0)
  @Get('reports/monthly')
  async getMonthlyReport(@Query('months') months?: string) {
    const data = await this.financeService.getMonthlyReport(Number(months) || 6);
    return { success: true, data };
  }

  // GET /api/finance/reports/daily - รายงานรายวัน
  @Get('reports/daily')
  async getDailyReport(
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
  ) {
    const result = await this.financeService.getDailyReport(start_date, end_date);
    return {
      success: true,
      message: 'ดึงข้อมูลรายงานรายวันเรียบร้อยแล้ว',
      data: result,
    };
  }

  // GET /api/finance/:id - ดึงข้อมูลตาม ID
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const result = await this.financeService.findOne(id);
    return {
      success: true,
      message: 'ดึงข้อมูลรายการการเงินเรียบร้อยแล้ว',
      data: result,
    };
  }

  // PATCH /api/finance/:id - อัปเดตข้อมูล
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFinanceRecordDto: UpdateFinanceRecordDto,
    @Request() req: any,
  ) {
    const currentUser = req.user?.username || req.user?.email || 'anonymous';
    const result = await this.financeService.update(id, updateFinanceRecordDto, currentUser);
    return {
      success: true,
      message: 'อัปเดตรายการการเงินเรียบร้อยแล้ว',
      data: result,
    };
  }

  // DELETE /api/finance/:id - ลบข้อมูล
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    const result = await this.financeService.remove(id);
    return {
      success: true,
      ...result,
    };
  }
}
