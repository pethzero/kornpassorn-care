import { Body, Controller, Get, Put, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SettingsService } from './settings.service';
import { ClinicSettingsDto } from './settings.dto';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  // เจ้าหน้าที่ทุกคนอ่านได้ (หน้าเอกสาร/นัดหมายใช้รายการบริการ + ราคาตั้งต้น)
  @Get('clinic')
  @Roles('user', 'admin')
  async getClinic() {
    return { success: true, data: await this.service.getClinic() };
  }

  @Put('clinic')
  @Roles('admin')
  async saveClinic(@Body() dto: ClinicSettingsDto, @Request() req: any) {
    const data = await this.service.saveClinic(dto, req.user?.username);
    return { success: true, message: 'บันทึกการตั้งค่าคลินิกแล้ว', data };
  }
}
