import { BadRequestException, Controller, Delete, Get, NotFoundException, Param, ParseUUIDPipe, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './guards';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthService } from './auth.service';

// admin ดูทุกคนที่เข้าสู่ระบบอยู่ (ผู้ดูแลระบบ / เจ้าหน้าที่ / คนไข้ / ผู้เยี่ยมชม) และเตะออกได้ — หน้า ตั้งค่า → ผู้ใช้ออนไลน์
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class SessionsAdminController {
  constructor(private readonly auth: AuthService) {}

  // ทุก session ที่ยังใช้งานได้ — online = มีการใช้งานภายใน 5 นาที
  @Get('sessions')
  async sessions(@Request() req: any) {
    return { success: true, data: await this.auth.listActiveSessions({ currentSessionId: req.user.sessionId }) };
  }

  // เตะออก: revoke ทั้ง session — เครื่องนั้นเรียก API ครั้งถัดไปได้ 401 และ refresh ไม่ได้ → เด้งไปหน้า login
  @Delete('sessions/:id')
  async kick(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    if (id === req.user.sessionId) throw new BadRequestException('นี่คืออุปกรณ์ที่คุณใช้อยู่');
    const ok = await this.auth.revokeSession(id, { revokedBy: req.user.userId, reason: 'kicked by admin' });
    if (!ok) throw new NotFoundException('ไม่พบ session นี้ (อาจออกจากระบบไปแล้ว)');
    return { success: true, message: 'ออกจากระบบอุปกรณ์นั้นแล้ว' };
  }

  // ประวัติการเข้าสู่ระบบล่าสุด รวมครั้งที่รหัสผิด (ดูว่ามีคนพยายามเดารหัสไหม)
  @Get('login-logs')
  async loginLogs(@Query('limit') limit = '50') {
    return { success: true, data: await this.auth.recentLogins(Number(limit)) };
  }
}
