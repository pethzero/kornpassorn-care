import { Controller, Post, Req, Res, Body, Get, UseGuards, HttpCode } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { buildDeviceInfo } from '../../utils/device.util';

// การจัดการอุปกรณ์/session: ของตัวเอง → /account/sessions · ของทุกคน (admin) → /admin/sessions
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('csrf-token')
  getCsrfToken(@Req() req: Request) {
    return req.csrfToken ? { csrfToken: req.csrfToken() } : { message: 'CSRF protection not applied properly' };
  }

  @Post('login')
  @HttpCode(201)
  async login(@Body() body: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // ผิดบ่อยเกิน → พักก่อน (ไม่เช็กรหัสเลย กันเดาต่อ)
    const waitMinutes = await this.authService.loginLockedFor(body.username, req);
    if (waitMinutes) {
      await this.authService.logLogin(null, false, req, 'Locked out', body.username);
      res.status(429);
      return { message: `ใส่รหัสผ่านผิดหลายครั้ง — ลองใหม่อีก ${waitMinutes} นาที` };
    }

    const user = await this.authService.validateUser(body.username, body.password);
    if (!user) {
      await this.authService.logLogin(null, false, req, 'Invalid credentials', body.username);
      res.status(401);
      return { message: 'Invalid credentials' };
    }

    // rememberMe: เครื่องส่วนตัว session ยาว / ไม่ติ๊ก (เครื่องแชร์) session สั้น — admin ไม่ขึ้นกับค่านี้
    const rememberMe = !!body.rememberMe;
    const tokens = await this.authService.issueTokenPair(user, rememberMe, buildDeviceInfo(req));
    await this.authService.logLogin({ user }, true, req);
    this.authService.setRefreshCookie(res, tokens);

    return {
      success: true,
      access_token: tokens.accessToken,
      expires_in: tokens.accessExpiresInSeconds,
      expired_at: tokens.accessExpiredAt ? tokens.accessExpiredAt.toISOString() : null,
      remember_me: rememberMe,
    };
  }

  @Post('guest')
  @HttpCode(201)
  async loginAsGuest(@Req() req: Request) {
    const result = await this.authService.issueGuestToken(buildDeviceInfo(req));
    return { success: true, ...result, is_guest: true };
  }

  // ออกจากระบบเครื่องนี้ = revoke ทั้ง session (access + refresh) — ไม่งั้น request ถัดไปจะ refresh กลับเข้ามาได้เอง
  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const auth = req.headers.authorization;
    const sessionId =
      (await this.authService.sessionIdOfToken(auth?.startsWith('Bearer ') ? auth.slice(7) : undefined, 'access')) ??
      (await this.authService.sessionIdOfToken(req.cookies?.refresh_token, 'refresh'));
    if (sessionId) await this.authService.revokeSession(sessionId, { reason: 'logout' });

    this.authService.clearRefreshCookie(res);
    return { success: true, message: 'Logged out' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request) {
    const user = (req as any).user;
    return { success: true, user: { id: user.userId, username: user.username, name: user.name ?? null, role: user.role } };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      res.status(401);
      return { message: 'No refresh token' };
    }
    try {
      const tokens = await this.authService.rotateRefreshToken(refreshToken, req);
      this.authService.setRefreshCookie(res, tokens);
      return { access_token: tokens.accessToken };
    } catch {
      this.authService.clearRefreshCookie(res);
      res.status(401);
      return { message: 'Invalid refresh token' };
    }
  }
}
