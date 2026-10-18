import { Controller, Get, Post, Body, Param, Put, Delete, Req, Res, HttpStatus, UseGuards } from '@nestjs/common';
import { PatientService } from './patient.service';
import { Request, Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

// ถ้าใช้ NestJS CSRF middleware ให้แน่ใจว่า path นี้ถูก apply CSRF

// จำกัดเฉพาะพนักงาน (user/admin) — คนไข้ที่ login ด้วย role 'patient' ต้องไม่เข้าถึง endpoint นี้ได้
// (เข้าถึงข้อมูลผู้ป่วยคนอื่นได้หมดถ้าไม่กันตรงนี้ ดู PatientAuthController สำหรับ endpoint ของคนไข้เอง)
@ApiTags('patients')
@ApiBearerAuth()
@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('user', 'admin')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Get()
  async findAll(@Res() res: Response) {
    const data = await this.patientService.findAll();
    return res.status(HttpStatus.OK).json(data);
  }

  // GET /patients/next-code — รหัสคนไข้ถัดไป (ตัวเลขล้วนมากสุด + 1 เติม 0 ให้ยาวเท่าเดิม เช่น 000001 → 000002)
  // ต้องอยู่เหนือ @Get(':id') ไม่งั้น "next-code" จะถูกตีความเป็น id
  @Get('next-code')
  async nextCode(@Res() res: Response) {
    return res.status(HttpStatus.OK).json({ code: await this.patientService.nextCode() });
  }

  @Get(':id')
  async findOne(@Param('id') id: number, @Res() res: Response) {
    const data = await this.patientService.findOne(Number(id));
    if (!data) return res.status(HttpStatus.NOT_FOUND).json({ message: 'Patient not found' });
    return res.status(HttpStatus.OK).json(data);
  }

  @Post()
  async create(@Body() data: any, @Req() req: Request, @Res() res: Response) {
    // CSRF token จะถูกตรวจสอบโดย middleware ก่อนถึง controller
    const created = await this.patientService.create(data);
    return res.status(HttpStatus.CREATED).json(created);
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() data: any, @Req() req: Request, @Res() res: Response) {
    const result = await this.patientService.update(Number(id), data);
    if (result.affected === 0) return res.status(HttpStatus.NOT_FOUND).json({ message: 'Patient not found' });
    return res.status(HttpStatus.OK).json({ message: 'Patient updated' });
  }

  @Delete(':id')
  async remove(@Param('id') id: number, @Req() req: Request, @Res() res: Response) {
    const result = await this.patientService.remove(Number(id));
    if (result.affected === 0) return res.status(HttpStatus.NOT_FOUND).json({ message: 'Patient not found' });
    return res.status(HttpStatus.OK).json({ message: 'Patient deleted' });
  }

  // แบบ updateOrCreate (Django style)
  @Post('upsert')
  async upsert(@Body() body: any, @Res() res: Response) {
    // สมมติ criteria คือ patient_code
    const result = await this.patientService.updateOrCreate(
      { patient_code: body.patient_code }, body
    );
    return res.status(200).json(result);
  }

  // แบบ raw SQL
  @Post('upsert-raw')
  async upsertRaw(@Body() body: any, @Res() res: Response) {
    const result = await this.patientService.upsertRaw(body);
    return res.status(200).json(result);
  }
}