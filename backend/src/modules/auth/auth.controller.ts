import { Controller, Post, Req, Res, Body, Get, Param, UseGuards, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response, Request } from 'express';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { v4 as uuidv4 } from 'uuid';
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

  // ...existing code...
  @Post('login')
  async login(@Body() body: LoginDto, @Req() req: Request, @Res() res: Response) {
    const user = await this.authService.validateUser(body.username, body.password);
    if (!user) {
      await this.authService.logLogin(null, false, req, 'Invalid credentials');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // --- Access token (สั้น, ใช้แนบทุก request) ---
    const expiresIn = Config.token.resolveAccessTokenExpiresIn(user.role);
    const isPermanent = expiresIn === undefined; // admin + ADMIN_ACCESS_TOKEN_EXPIRES_IN=0

    const jti = uuidv4();
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      jti,
    };

    const token = this.authService.generateJwt(payload, expiresIn);
    const expiresInSeconds = Config.token.parseExpiresIn(expiresIn);
    const expiredAt = expiresInSeconds > 0 ? new Date(Date.now() + expiresInSeconds * 1000) : null;

    const deviceInfo = buildDeviceInfo(req, (req.body as any) || {});

    await this.authService.saveToken(user, token, expiredAt, jti, {
      deviceInfo,
      tokenType: 'access',
      isPermanent,
    });

    await this.authService.logLogin(user, true, req);

    const oneYearMs = 365 * 24 * 60 * 60 * 1000;
    const cookieOptions: any = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    };
    // token ไม่มี expiry (permanent) ก็ต้องให้ cookie อยู่ข้ามการปิดเบราว์เซอร์ด้วย ไม่งั้นเป็นแค่ session cookie
    cookieOptions.maxAge = expiredAt ? expiredAt.getTime() - Date.now() : oneYearMs * 10;

    res.cookie('token', token, cookieOptions);

    // --- Refresh token (ยาว, เก็บใน httpOnly cookie แยก ให้ /auth/refresh ต่ออายุ access token ได้โดย user ไม่ต้อง login ซ้ำ) ---
    // rememberMe: user (พนักงาน) ที่ใช้เครื่องส่วนตัวติ๊กไว้ได้ ถ้าไม่ติ๊กจะได้ session สั้นกว่า (เหมาะกับเครื่องแชร์กันในหน่วยงาน)
    const rememberMe = !!body.rememberMe;
    const refreshExpiresIn = rememberMe
      ? Config.token.REFRESH_TOKEN_REMEMBER_ME_EXPIRES_IN
      : Config.token.REFRESH_TOKEN_EXPIRES_IN;
    const refreshJti = uuidv4();
    const refreshPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      jti: refreshJti,
      remember: rememberMe,
    };
    const refreshToken = await this.authService.generateRefreshToken(refreshPayload, refreshExpiresIn);
    const refreshExpiresInSeconds = Config.token.parseExpiresIn(refreshExpiresIn);
    const refreshExpiredAt = new Date(Date.now() + refreshExpiresInSeconds * 1000);

    await this.authService.saveToken(user, refreshToken, refreshExpiredAt, refreshJti, {
      deviceInfo,
      tokenType: 'refresh',
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: refreshExpiresInSeconds * 1000,
    });

    return res.json({
      success: true,
      access_token: token,
      expires_in: expiresInSeconds,
      expired_at: expiredAt ? expiredAt.toISOString() : null,
      jti,
      is_permanent: isPermanent,
    });
  }
  // ...existing code...

  // ...existing code...
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
  // ...existing code...


  // ...existing code...
  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    // รับ token จาก cookie ก่อน แล้ว fallback ไปที่ Authorization header
    const cookieToken = req.cookies?.token;
    let token = cookieToken;
    const authHeader = (req.headers['authorization'] || req.headers['Authorization']) as string | undefined;
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
    if (token) {
      try {
        await this.authService.revokeToken(token);
      } catch (err) {
        console.error('Error revoking token:', err);
        // ไม่ต้องส่ง error กลับ client เพื่อไม่ให้ leak info — ทำต่อไปเพื่อ clear cookie
      }
    }
    // เคลียร์ cookie ด้วย options เดียวกับตอนตั้งค่า (secure ตาม env)
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return res.status(200).json({ success: true, message: 'Logged out' });
  }
  // ...existing code...

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
  async revokeAllTokens(@Param('userId') userId: string) {
    await this.authService.revokeAllTokensOfUser(userId);
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

    const revokedCount = await this.authService.revokeAllTokensOfUser(userId);
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

      const newJti = uuidv4();

      const newPayload = {
        sub: payload.sub,
        username: payload.username,
        role: payload.role,
        jti: newJti,
      };

      const newAccessExpiresIn = Config.token.resolveAccessTokenExpiresIn(payload.role);
      const newAccessToken = this.authService.generateJwt(newPayload, newAccessExpiresIn);

      // คง remember-me duration เดิมของ session นี้ไว้ตอน rotate refresh token
      const refreshExpiresIn = payload.remember
        ? Config.token.REFRESH_TOKEN_REMEMBER_ME_EXPIRES_IN
        : Config.token.REFRESH_TOKEN_EXPIRES_IN;
      const refreshExpiresInSeconds = Config.token.parseExpiresIn(refreshExpiresIn);
      const refreshExpiresAt = new Date(Date.now() + refreshExpiresInSeconds * 1000);

      // 🔥 ต้อง await
      const newRefreshToken = await this.authService.generateRefreshToken(
        { ...newPayload, remember: payload.remember },
        refreshExpiresIn,
      );

      await this.authService.saveToken(
        { id: payload.sub },
        newRefreshToken,
        refreshExpiresAt,
        newJti,
        { tokenType: 'refresh' }
      );

      res.cookie('refresh_token', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: refreshExpiresInSeconds * 1000,
      });

      return res.json({
        access_token: newAccessToken,
      });

    } catch (err) {
      res.clearCookie('refresh_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });

      return res.status(401).json({ message: 'Invalid refresh token' });
    }
  }


}
