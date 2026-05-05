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
import { BearerTokenGuard } from '../auth/guards/bearer-token.guard';
import { JwtAuthGuard } from '../auth/guards';
import { FlexibleAuthGuard } from '../auth/guards/flexible-auth.guard';

@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) { }

  // POST /api/finance - สร้างรายการการเงินใหม่
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(FlexibleAuthGuard) // API และ Web ใช้ได้ทั้งคู่
  
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
  @UseGuards(FlexibleAuthGuard) // API และ Web ใช้ได้ทั้งคู่
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
  @UseGuards(FlexibleAuthGuard) // API และ Web ใช้ได้ทั้งคู่
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
  @UseGuards(FlexibleAuthGuard) // API และ Web ใช้ได้ทั้งคู่
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
  @UseGuards(FlexibleAuthGuard) // API และ Web ใช้ได้ทั้งคู่
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
  @UseGuards(FlexibleAuthGuard) // API และ Web ใช้ได้ทั้งคู่
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
  @UseGuards(FlexibleAuthGuard) // API และ Web ใช้ได้ทั้งคู่
  async remove(@Param('id', ParseIntPipe) id: number) {
    const result = await this.financeService.remove(id);
    return {
      success: true,
      ...result,
    };
  }
}
