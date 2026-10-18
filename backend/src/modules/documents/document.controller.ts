import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

import { DocumentService } from './document.service';
import { CreateDocumentDto, VoidDocumentDto } from './dto/create-document.dto';
import { QueryDocumentDto } from './dto/query-document.dto';

@ApiTags('documents')
@ApiBearerAuth()
@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('user', 'admin')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  // POST /api/documents — สร้างเอกสาร (ขยับสต็อก + ลงบัญชีการเงินให้อัตโนมัติ)
  @Post()
  async create(@Body() dto: CreateDocumentDto, @Request() req: any) {
    const currentUser = req.user?.username || req.user?.email || 'anonymous';
    const data = await this.documentService.create(dto, currentUser);
    return { success: true, message: `บันทึกเอกสาร ${data.doc_no} เรียบร้อยแล้ว`, data };
  }

  @Get()
  async findAll(@Query() query: QueryDocumentDto) {
    const result = await this.documentService.findAll(query);
    return { success: true, ...result };
  }

  // ต้องอยู่เหนือ @Get(':id') ไม่งั้น ParseIntPipe จะพยายาม parse "summary" เป็นเลข
  @Get('summary')
  async getSummary() {
    const data = await this.documentService.getSummary();
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.documentService.findOne(id);
    return { success: true, data };
  }

  // PATCH /api/documents/:id/void — ยกเลิกเอกสาร (ย้อนสต็อก + ลบรายการบัญชีที่ลงไว้)
  @Patch(':id/void')
  async voidDocument(@Param('id', ParseIntPipe) id: number, @Body() dto: VoidDocumentDto, @Request() req: any) {
    const currentUser = req.user?.username || req.user?.email || 'anonymous';
    const data = await this.documentService.voidDocument(id, dto.reason, currentUser);
    return { success: true, message: `ยกเลิกเอกสาร ${data.doc_no} เรียบร้อยแล้ว`, data };
  }
}
