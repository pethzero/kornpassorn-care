import { Controller, Post, Req, Res, Body, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response, Request } from 'express';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('login')
  async login(@Body() body: LoginDto, @Res() res: Response) {
    const user = await this.authService.validateUser(body.username, body.password);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const token = this.authService.generateJwt({
      sub: user.id,
      username: user.username,
      role: user.role,
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // set true in production (HTTPS)
      sameSite: 'strict',
    });

    return res.json({ message: 'Login successful' });
  }

  @Get('csrf-token')
  getCsrfToken(@Req() req: Request) {
    if (req.csrfToken) {
      return { csrfToken: req.csrfToken() };
    } else {
      return { message: 'CSRF protection not applied properly' };
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
