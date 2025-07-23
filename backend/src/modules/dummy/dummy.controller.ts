import { Controller, Post, Body, Req, HttpException, HttpStatus } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Controller('dummy')
export class DummyController {
  @Post('hash-password')
  async hashPassword(@Body('password') password: string, @Req() req) {
    try {
      if (!password) {
        return { error: 'Password is required' };
      }
      // ถ้ามีการเช็ค CSRF ด้วย middleware แล้ว error จะถูก throw ออกมา
      const hash = await bcrypt.hash(password, 10);
      return { hash };
    } catch (error) {
      // ตรวจสอบว่าเป็น CSRF error หรือไม่
      if (error.code === 'EBADCSRFTOKEN' || error.message?.includes('csrf')) {
        throw new HttpException('Invalid CSRF token', HttpStatus.FORBIDDEN);
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}