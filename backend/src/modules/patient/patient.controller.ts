import { Controller, Get, Post, Body, Param, Put, Delete, Req, Res, HttpStatus, UseGuards } from '@nestjs/common';
import { PatientService } from './patient.service';
import { Request, Response } from 'express';

// สมมติว่าคุณมี AuthGuard และ CSRF middleware อยู่แล้ว
// ถ้าใช้ NestJS CSRF middleware ให้แน่ใจว่า path นี้ถูก apply CSRF

@Controller('patients')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Get()
  async findAll(@Res() res: Response) {
    const data = await this.patientService.findAll();
    return res.status(HttpStatus.OK).json(data);
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
}