import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

import { HospitalScheduleService } from './hospital-schedule.service';
import { SaveWeeklyHoursDto } from './dto/save-weekly-hours.dto';
import { CreateSpecialDayDto } from './dto/create-special-day.dto';

@ApiTags('hospital-schedule')
@Controller('hospital-schedule')
export class HospitalScheduleController {
  constructor(private readonly service: HospitalScheduleService) {}

  // public — คนทั่วไปดูได้โดยไม่ต้อง login
  @Get()
  getPublicSchedule() {
    return this.service.getPublicSchedule();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin')
  @Put('weekly')
  saveWeekly(@Body() dto: SaveWeeklyHoursDto) {
    return this.service.saveWeekly(dto.days);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin')
  @Post('special-days')
  addSpecialDay(@Body() dto: CreateSpecialDayDto) {
    return this.service.addSpecialDay(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin')
  @Delete('special-days/:id')
  removeSpecialDay(@Param('id') id: string) {
    return this.service.removeSpecialDay(Number(id));
  }
}
