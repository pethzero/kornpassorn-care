import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/guards';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

import { FinanceTransactionService } from './finance-transaction.service';
import { CreateFinanceTransactionDto } from './dto/create-finance-transaction.dto';
import { QueryFinanceTransactionDto } from './dto/query-finance-transaction.dto';

@ApiTags('finance-transactions')
@ApiBearerAuth()
// เส้นทางแยกจาก /finance ของเดิมโดยตั้งใจ (ไม่ใช่ /finance/transactions) — Controller('finance')
// เดิมมี @Get(':id') ที่ใช้ ParseIntPipe ซึ่งจะ match "/finance/transactions" โดยตีความ "transactions"
// เป็น :id แล้วพังตอน parse เป็นเลข ก่อนที่ request จะมาถึง controller นี้ด้วยซ้ำ
@Controller('finance-transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('user', 'admin')
export class FinanceTransactionController {
  constructor(
    private readonly financeTransactionService: FinanceTransactionService,
  ) {}

  // POST /api/finance/transactions - สร้างเอกสารการเงิน (ซื้อ/ขาย/รายรับ/รายจ่าย) พร้อมรายการย่อย
  @Post()
  async create(@Body() dto: CreateFinanceTransactionDto, @Request() req: any) {
    const currentUser = req.user?.username || req.user?.email || 'anonymous';
    const data = await this.financeTransactionService.create(dto, currentUser);
    return { success: true, message: 'สร้างเอกสารการเงินเรียบร้อยแล้ว', data };
  }

  // GET /api/finance/transactions - รายการเอกสารทั้งหมด (pagination + filter)
  @Get()
  async findAll(@Query() query: QueryFinanceTransactionDto) {
    const result = await this.financeTransactionService.findAll(query);
    return { success: true, ...result };
  }

  // GET /api/finance/transactions/summary - สรุปยอดวันนี้ + ปีนี้ สำหรับหน้ารายการ
  // ต้องอยู่เหนือ @Get(':id') ไม่งั้น ParseIntPipe จะพยายาม parse "summary" เป็นเลขแล้ว 400 ก่อนถึง route นี้
  @Get('summary')
  async getSummary() {
    const data = await this.financeTransactionService.getSummary();
    return { success: true, data };
  }

  // GET /api/finance/transactions/:id - รายละเอียดเอกสาร 1 ใบ พร้อมรายการย่อย
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.financeTransactionService.findOne(id);
    return { success: true, data };
  }

  // PATCH /api/finance/transactions/:id/void - ยกเลิกเอกสาร (ย้อนสต็อกที่ถูกตัด/เติมไปคืน)
  @Patch(':id/void')
  async voidTransaction(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    const currentUser = req.user?.username || req.user?.email || 'anonymous';
    const data = await this.financeTransactionService.voidTransaction(
      id,
      currentUser,
    );
    return { success: true, message: 'ยกเลิกเอกสารเรียบร้อยแล้ว', data };
  }
}
