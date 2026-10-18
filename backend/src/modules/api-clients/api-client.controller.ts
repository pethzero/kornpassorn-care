import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiClientService } from './api-client.service';
import { CreateApiClientDto, UpdateApiClientDto } from './dto/api-client.dto';

// จัดการระบบภายนอกที่เรียก API ได้ — เฉพาะ admin
@ApiTags('api-clients')
@ApiBearerAuth()
@Controller('api-clients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ApiClientController {
  constructor(private readonly service: ApiClientService) {}

  @Get('scopes')
  scopes() {
    return { success: true, data: this.service.listScopes() };
  }

  @Get()
  async findAll() {
    return { success: true, data: await this.service.findAll() };
  }

  @Post()
  async create(@Body() dto: CreateApiClientDto, @Request() req: any) {
    const data = await this.service.create(dto, req.user?.username);
    return { success: true, message: 'สร้าง API client แล้ว — คัดลอก secret ตอนนี้ จะไม่แสดงอีก', data };
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateApiClientDto) {
    return { success: true, message: 'อัปเดตแล้ว', data: await this.service.update(id, dto) };
  }

  @Post(':id/rotate-secret')
  async rotate(@Param('id', ParseIntPipe) id: number) {
    const data = await this.service.rotateSecret(id);
    return { success: true, message: 'สร้าง secret ใหม่แล้ว — secret เดิมใช้ไม่ได้อีก', data };
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const data = await this.service.remove(id);
    return { success: true, message: `ลบ "${data.name}" แล้ว`, data };
  }
}
