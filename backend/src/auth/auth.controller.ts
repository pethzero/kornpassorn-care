import { Controller, Post, Req, Res, Body, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response, Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  // ✅ ให้ frontend เรียกหลัง login เพื่อขอ csrfToken
  @Get('csrf-token')
  getCsrfToken(@Req() req: Request) {
    if (req.csrfToken) {
      return { csrfToken: req.csrfToken() }; // ส่งคืน CSRF token
    } else {
      return { message: 'CSRF protection not applied properly' }; // แจ้งเตือนถ้า csrfToken() ไม่สามารถใช้งานได้
    }
  }

  @Post('login')
  async login(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    const user = await this.authService.validateUser(body.username, body.password);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const payload = { sub: user.id, username: user.username, role: user.role };
    const token = this.authService.generateJwt(payload);

    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // เปลี่ยนเป็น true ถ้าใช้ https
      sameSite: 'strict',
    });

    // ถ้า `req.csrfToken` เป็นฟังก์ชันจริงๆ จะสามารถเรียกได้
    if (req.csrfToken) {
      return res.json({ csrfToken: req.csrfToken() });
    }

    return res.status(500).json({ message: 'CSRF token not available' });
  }

}
