import { Controller, Post, Req, Res, Body, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response, Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  
  @Post('login')
  async login(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    const user = await this.authService.validateUser(body.username, body.password);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const payload = { sub: user.id, username: user.username, role: user.role };
    const token = this.authService.generateJwt(payload);

    res.cookie('token', token, {
      httpOnly: true, // เพิ่มความปลอดภัยไม่ให้สามารถอ่าน cookie ได้จาก JavaScript
      secure: false,  // ใช้ `true` เมื่อใช้ https
      sameSite: 'strict', // ป้องกัน CSRF ข้ามเว็บไซต์
    });

    // ส่ง CSRF token กลับมา
    if (req.csrfToken) {
      return res.json({ csrfToken: req.csrfToken() });
    }

    return res.status(500).json({ message: 'CSRF token not available' });
  }


  @Get('csrf-token')
  getCsrfToken(@Req() req: Request) {
    if (req.csrfToken) {
      return { csrfToken: req.csrfToken() }; // ส่งคืน CSRF token
    } else {
      return { message: 'CSRF protection not applied properly' }; // แจ้งเตือนถ้า csrfToken() ไม่สามารถใช้งานได้
    }
  }

}
