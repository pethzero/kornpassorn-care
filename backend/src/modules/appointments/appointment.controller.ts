import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto, QueryAppointmentDto, UpdateAppointmentDto } from './dto/appointment.dto';

// นัดหมาย — ใช้ภายใน (เจ้าหน้าที่) ระบบภายนอกอ่านผ่าน /api/v1/appointments แทน
@ApiTags('appointments')
@ApiBearerAuth()
@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('user', 'admin')
export class AppointmentController {
  constructor(private readonly service: AppointmentService) {}

  @Get()
  async findAll(@Query() query: QueryAppointmentDto) {
    return { success: true, data: await this.service.findAll(query) };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return { success: true, data: await this.service.findOne(id) };
  }

  @Post()
  async create(@Body() dto: CreateAppointmentDto, @Request() req: any) {
    const data = await this.service.create(dto, req.user?.username);
    return { success: true, message: 'บันทึกนัดหมายแล้ว', data };
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAppointmentDto, @Request() req: any) {
    const data = await this.service.update(id, dto, req.user?.username);
    return { success: true, message: 'อัปเดตนัดหมายแล้ว', data };
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const data = await this.service.remove(id);
    return { success: true, message: 'ลบนัดหมายแล้ว', data };
  }
}
