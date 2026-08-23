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

@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) { }

  // POST /api/finance - สร้างรายการการเงินใหม่
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  
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
      user: req.user, // ข้อมูลผู้ใช้จาก token
    };
  }

  // GET /api/finance - ดึงข้อมูลทั้งหมด (พร้อม pagination และ filter)
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Query() query: QueryFinanceRecordDto) {
    console.log('Query parameters:', query);
    const result = await this.financeService.findAll(query);
    return {
      success: true,
      message: 'ดึงข้อมูลรายการการเงินเรียบร้อยแล้ว',
      ...result,
    };
  }

  // GET /api/finance/summary - สรุปยอดรายได้/รายจ่าย
  @Get('summary')
  @UseGuards(JwtAuthGuard)
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

  // GET /api/finance/reports/daily - รายงานรายวัน
  @Get('reports/daily')
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id', ParseIntPipe) id: number) {
    const result = await this.financeService.remove(id);
    return {
      success: true,
      ...result,
    };
  }
}
