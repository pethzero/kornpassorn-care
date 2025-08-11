import { Controller, Post, Req, Res, Body, Get, Param, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response, Request } from 'express';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('login')
  async login(@Body() body: LoginDto, @Req() req: Request, @Res() res: Response) {
    const user = await this.authService.validateUser(body.username, body.password);

    if (!user) {
      await this.authService.logLogin(null, false, req, 'Invalid credentials');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = this.authService.generateJwt({
      sub: user.id,
      username: user.username,
      role: user.role,
    });

    // บันทึก token
    const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // ตัวอย่าง 1 วัน
    await this.authService.saveToken(user, token, expiredAt);

    // บันทึก log สำเร็จ
    await this.authService.logLogin(user, true, req);

    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
    });
    return res.json({ access_token: token });
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

  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    const token = req.cookies['token'];
    if (token) {
      await this.authService.revokeToken(token);
    }
    res.clearCookie('token');
    return res.json({ message: 'Logged out' });
  }

  // API สำหรับขอ token โดยใช้ username/password (สำหรับ API users)
  @Post('token')
  async getApiToken(@Body() body: { username?: string; password?: string }, @Req() req: Request, @Res() res: Response) {
    // ตรวจสอบ username และ password ใน request body
    if (!body || !body.username || !body.password) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุ username และ password ใน request body'
      });
    }

    const result = await this.authService.getTokenByCredentials(body.username, body.password, req);
    console.log('API Token Request:', body.username, result);
    
    if (!result.success) {
      return res.status(401).json({
        success: false,
        message: result.message
      });
    }

    return res.json({
      success: true,
      access_token: result.access_token,
      expires_in: result.expires_in,
      token_type: 'Bearer',
      user_role: result.user_role
    });
  }

  // Admin revoke ทุก token ของ user
  @UseGuards(JwtAuthGuard)
  @Post('revoke-all/:userId')
  async revokeAllTokens(@Param('userId') userId: string) {
    await this.authService.revokeAllTokensOfUser(userId);
    return { message: 'All tokens revoked for user ' + userId };
  }
}
