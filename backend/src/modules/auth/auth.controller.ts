import { Controller, Post, Req, Res, Body, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response, Request } from 'express';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  
  @Post('login')
  async login(@Body() body: LoginDto, @Req() req: Request, @Res() res: Response) {
    const user = await this.authService.validateUser(body.username, body.password);
    console.log(user);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const token = this.authService.generateJwt({
      sub: user.id,
      username: user.username,
      role: user.role,
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
    });

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

  @Post('guest')
  async loginAsGuest(@Res() res: Response) {
    const result = this.authService.loginAsGuest();
    res.cookie('token', result.access_token, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
    });
    return res.json({ access_token: result.access_token });
  }

}
