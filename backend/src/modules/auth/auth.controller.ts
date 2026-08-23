import { Controller, Post, Req, Res, Body, Get, Param, UseGuards, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response, Request } from 'express';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import * as UAParser from 'ua-parser-js';
import { Config } from '../../config';
import { buildDeviceInfo } from '../../utils/device.util';
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }


  @Get('csrf-token')
  getCsrfToken(@Req() req: Request) {
    if (req.csrfToken) {
      return { csrfToken: req.csrfToken() };
    } else {
      return { message: 'CSRF protection not applied properly' };
    }
  }

  @Post('login')
  async login(@Body() body: LoginDto, @Req() req: Request, @Res() res: Response) {
    const user = await this.authService.validateUser(body.username, body.password);
    if (!user) {
      await this.authService.logLogin(null, false, req, 'Invalid credentials');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // admin: อายุ token กำหนดจาก ADMIN_ACCESS_TOKEN_EXPIRES_IN เท่านั้น (permanent by default) ไม่ขึ้นกับ rememberMe
    // user: rememberMe ยืดอายุ access token ให้เท่ากับ refresh token remember-me duration
    // rememberMe: user (พนักงาน) ที่ใช้เครื่องส่วนตัวติ๊กไว้ได้ ถ้าไม่ติ๊กจะได้ session สั้นกว่า (เหมาะกับเครื่องแชร์กันในหน่วยงาน)
    const rememberMe = !!body.rememberMe;
    const deviceInfo = buildDeviceInfo(req, (req.body as any) || {});

    const tokens = await this.authService.issueTokenPair(user, rememberMe, deviceInfo);

    await this.authService.logLogin(user, true, req);

    // refresh token เก็บใน httpOnly cookie แยก ให้ /auth/refresh ต่ออายุ access token ได้โดย user ไม่ต้อง login ซ้ำ
    res.cookie(
      'refresh_token',
      tokens.refreshToken,
      Config.token.refreshCookieOptions(tokens.refreshExpiresInSeconds * 1000),
    );

    return res.json({
      success: true,
      access_token: tokens.accessToken,
      expires_in: tokens.accessExpiresInSeconds,
      expired_at: tokens.accessExpiredAt ? tokens.accessExpiredAt.toISOString() : null,
      jti: tokens.accessJti,
      is_permanent: tokens.isPermanent,
      remember_me: rememberMe,
    });
  }

  @Post('guest')
  async loginAsGuest(@Req() req: Request, @Res() res: Response) {
    try {
      const ua = new UAParser.UAParser(req.headers['user-agent'] || '');
      const uaResult = ua.getResult();

      const deviceInfo = {
        raw: req.headers['user-agent'],
        client: uaResult.browser.name ? 'browser' : 'mobile',
        ua: {
          family: uaResult.browser.name,
          version: uaResult.browser.version,
        },
        os: {
          name: uaResult.os.name,
          version: uaResult.os.version,
        },
        device: {
          vendor: uaResult.device.vendor || null,
          brand: uaResult.device.vendor || null,
          model: uaResult.device.model || null,
        },
        ip: ((req.headers['x-forwarded-for'] as string) || req.ip)?.split(',')[0].trim(),
        fingerprint: (req.headers['x-client-fingerprint'] as string) || null
      };

      const result = await this.authService.loginAsGuest(deviceInfo);

      if (!result?.access_token) {
        return res.status(500).json({ success: false, message: 'Failed to create guest token' });
      }

      // ❌ ไม่ต้อง set cookie
      // res.cookie('token', ...)

      return res.json({
        success: true,
        access_token: result.access_token,
        expires_in: result.expires_in,
        expired_at: result.expired_at,
        jti: result.jti,
        is_guest: true
      });

    } catch (err) {
      console.error('loginAsGuest error:', err);
      return res.status(500).json({ success: false, message: 'Internal error' });
    }
  }


  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    const authHeader = (req.headers['authorization'] || req.headers['Authorization']) as string | undefined;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    // ต้อง revoke + clear refresh_token ด้วย ไม่งั้น request ถัดไปที่โดน 401
    // จะไปยิง /auth/refresh แล้วได้ access token ใหม่กลับมาเอง กลายเป็นว่า logout ไม่จริง
    const refreshToken = req.cookies?.refresh_token;

    // สอง token คนละ record กัน ไม่ block กัน ยิงพร้อมกันได้ (allSettled กัน error ของอันนึงไปกระทบอีกอัน)
    const [tokenResult, refreshResult] = await Promise.allSettled([
      token ? this.authService.revokeToken(token, { reason: 'logout' }) : Promise.resolve(),
      refreshToken ? this.authService.revokeToken(refreshToken, { reason: 'logout' }) : Promise.resolve(),
    ]);
    if (tokenResult.status === 'rejected') console.error('Error revoking token:', tokenResult.reason);
    if (refreshResult.status === 'rejected') console.error('Error revoking refresh token:', refreshResult.reason);

    // เคลียร์ cookie ด้วย options เดียวกับตอนตั้งค่า (secure ตาม env)
    // path ต้อง match กับตอน res.cookie(...) ด้วย ไม่งั้น clearCookie จะไม่ลบ cookie ตัวจริงที่ path '/'
    res.clearCookie('refresh_token', Config.token.refreshCookieOptions());
    // legacy: session ที่ login ไว้ก่อนตัด 'token' cookie ออก อาจยังมี cookie ตัวนี้ค้างอยู่ในเบราว์เซอร์
    res.clearCookie('token', Config.token.refreshCookieOptions());

    return res.status(200).json({ success: true, message: 'Logged out' });
  }

  // API สำหรับขอ token โดยใช้ username/password (สำหรับ API users)
  @Post('token')
  async getApiToken(@Body() body: { username?: string; password?: string }, @Req() req: Request, @Res() res: Response) {
    try {
      const username = body.username ?? '';
      const password = body.password ?? '';
      if (!username || !password) {
        return res.status(400).json({ success: false, message: 'username and password are required' });
      }

      const ua = new UAParser.UAParser(req.headers['user-agent'] || '');
      const uaResult = ua.getResult();
      const deviceInfo = {
        raw: req.headers['user-agent'] || null,
        ua: uaResult,
        ip: ((req.headers['x-forwarded-for'] as string) || req.ip)?.split(',')[0].trim(),
        fingerprint: (req.headers['x-client-fingerprint'] as string) || (body && (body as any).fingerprint) || null,
      };

      const result = await this.authService.getTokenByCredentials(username, password, req, deviceInfo);

      if (!result.success) {
        return res.status(401).json(result);
      }
      return res.json(result);
    } catch (err) {
      console.error('getApiToken controller error:', err);
      return res.status(500).json({ success: false, message: 'Internal error' });
    }
  }


  // Admin revoke ทุก token ของ user
  @UseGuards(JwtAuthGuard)
  @Post('revoke-all/:userId')
  async revokeAllTokens(@Param('userId') userId: string, @Req() req: Request) {
    const actor = (req as any).user;
    const actorId = actor?.userId ?? actor?.sub;
    await this.authService.revokeAllTokensOfUser(userId, { revokedBy: actorId, reason: 'admin_revoke_all' });
    return { message: 'All tokens revoked for user ' + userId };
  }

  @UseGuards(JwtAuthGuard)
  @Post('revoke-id/:userId')
  async revokeIdTokens(@Param('userId') userId: string, @Req() req: Request) {
    const actor = (req as any).user;
    const actorId = actor?.userId ?? actor?.sub;
    const actorRole = actor?.role;

    // allow only admin or the owner of the tokens
    if (actorRole !== 'admin' && actorId !== userId) {
      throw new ForbiddenException('Not allowed to revoke tokens for this user');
    }

    const revokedCount = await this.authService.revokeAllTokensOfUser(userId, {
      revokedBy: actorId,
      reason: actorRole === 'admin' ? 'admin_revoke_all' : 'self_revoke_all',
    });
    return { message: `All tokens revoked for user ${userId}`, revoked: revokedCount };
  }

  // GET /auth/me
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: Request, @Res() res: Response) {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false });
    }
    // normalize response expected by frontend
    return res.json({
      success: true,
      user: {
        id: user.userId ?? user.sub,
        username: user.username,
        name: user.name ?? null,
        role: user.role,
      },
    });
  }


  // GET /auth/sessions
  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  async sessions(@Req() req: Request) {
    const actor = (req as any).user;
    const userId = actor?.userId ?? actor?.sub;
    const sessions = await this.authService.findSessionsForUser(userId);
    return { success: true, sessions };
  }

  // POST /auth/revoke/:jti
  @UseGuards(JwtAuthGuard)
  @Post('revoke/:jti')
  async revoke(@Param('jti') jti: string, @Req() req: Request) {
    const actor = (req as any).user;
    await this.authService.revokeTokenByJti(jti, actor);
    return { success: true };
  }


  @Post('refresh')
  async refresh(@Req() req: Request, @Res() res: Response) {
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
      return res.status(401).json({ message: 'No refresh token' });
    }

    try {
      const payload = await this.authService.verifyRefreshToken(refreshToken);

      if (payload.is_guest) {
        return res.status(401).json({ message: 'Guest cannot refresh' });
      }

      const isValid = await this.authService.isRefreshTokenValid(payload.jti);
      if (!isValid) {
        return res.status(401).json({ message: 'Refresh token revoked/expired' });
      }

      // 🔥 ใช้ method ใหม่
      await this.authService.revokeRefreshTokenByJti(payload.jti);

      // ใช้ helper เดียวกับ login (issueTokenPair) เพื่อให้กฎ "admin ไม่ขึ้นกับ rememberMe" คงเดิมตอน rotate ด้วย
      // (เดิมจุดนี้เช็คแค่ payload.remember ไม่เช็ค role ทำให้ admin ที่เผลอ login มาพร้อม rememberMe:true
      // จะโดนลดอายุ access token จาก permanent เหลือ 30 วันทุกครั้งที่ refresh)
      // และต้อง save access token ใหม่ลง DB ด้วย ไม่งั้น JwtStrategy หา UserToken record ไม่เจอ
      // (lookup by jti/tokenHash) แล้ว 401 ทันทีตั้งแต่ request แรกที่ใช้ access token ที่เพิ่ง refresh มา
      const tokens = await this.authService.issueTokenPair(
        { id: payload.sub, username: payload.username, role: payload.role },
        !!payload.remember,
      );

      res.cookie(
        'refresh_token',
        tokens.refreshToken,
        Config.token.refreshCookieOptions(tokens.refreshExpiresInSeconds * 1000),
      );

      return res.json({
        access_token: tokens.accessToken,
      });

    } catch (err) {
      res.clearCookie('refresh_token', Config.token.refreshCookieOptions());

      return res.status(401).json({ message: 'Invalid refresh token' });
    }
  }


}
