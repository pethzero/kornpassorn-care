import { Controller, Post, Req, Res, Body, Get, Param, UseGuards, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response, Request } from 'express';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { v4 as uuidv4 } from 'uuid';
import * as UAParser from 'ua-parser-js';
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

    const adminNeverExpire = (process.env.ADMIN_NEVER_EXPIRE === 'true');
    const userDefault = process.env.ACCESS_TOKEN_EXPIRES_IN || '1d';
    const adminDefault = process.env.ADMIN_ACCESS_TOKEN_EXPIRES_IN || '30d';
    let expiresIn: string | undefined = user.role === 'admin' ? adminDefault : userDefault;
    if (user.role === 'admin' && adminNeverExpire) {
      expiresIn = undefined;
    }

    const jti = uuidv4();
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      jti,
    };

    const token = this.authService.generateJwt(payload, expiresIn);

    // parse expiresIn string -> seconds
    const parseExpiresIn = (str: string | undefined): number => {
      if (!str) return 0;
      const match = str.match(/^(\d+)([dhms])$/);
      if (!match) return 0;
      const value = parseInt(match[1], 10);
      switch (match[2]) {
        case 'd': return value * 24 * 60 * 60;
        case 'h': return value * 60 * 60;
        case 'm': return value * 60;
        case 's': return value;
        default: return 0;
      }
    };

    const expiresInSeconds = parseExpiresIn(expiresIn);
    const expiredAt = expiresInSeconds > 0 ? new Date(Date.now() + expiresInSeconds * 1000) : null;

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
      app: {
        name: (req.headers['x-app-name'] as string) || null,
        version: (req.headers['x-app-version'] as string) || null,
      },
      ip: ((req.headers['x-forwarded-for'] as string) || req.ip)?.split(',')[0].trim(),
      locale: req.headers['accept-language'] || null,
      timezone: (req.headers['x-timezone'] as string) || null,
      screen: {
        width: (req.headers['x-screen-width'] as any) || null,
        height: (req.headers['x-screen-height'] as any) || null,
      },
      fingerprint: (req.headers['x-client-fingerprint'] as string) || (req.body && (req.body as any).fingerprint) || null
    };

    // ส่ง isPermanent ถ้า admin และตั้ง ADMIN_NEVER_EXPIRE=true
    await this.authService.saveToken(user, token, expiredAt, jti, {
      deviceInfo,
      tokenType: 'access',
      isPermanent: user.role === 'admin' && adminNeverExpire,
    });

    await this.authService.logLogin(user, true, req);

    const cookieOptions: any = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    };
    if (expiredAt) cookieOptions.maxAge = expiredAt.getTime() - Date.now();

    res.cookie('token', token, cookieOptions);

    return res.json({
      success: true,
      access_token: token,
      expires_in: expiresInSeconds,
      expired_at: expiredAt ? expiredAt.toISOString() : null,
      jti,
      is_permanent: user.role === 'admin' && adminNeverExpire,
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
        app: {
          name: (req.headers['x-app-name'] as string) || null,
          version: (req.headers['x-app-version'] as string) || null,
        },
        ip: ((req.headers['x-forwarded-for'] as string) || req.ip)?.split(',')[0].trim(),
        locale: req.headers['accept-language'] || null,
        timezone: (req.headers['x-timezone'] as string) || null,
        screen: {
          width: (req.headers['x-screen-width'] as any) || null,
          height: (req.headers['x-screen-height'] as any) || null,
        },
        fingerprint: (req.headers['x-client-fingerprint'] as string) || (req.body && (req.body as any).fingerprint) || null
      };

      // let service create token and save using provided deviceInfo
      const result = await this.authService.loginAsGuest(deviceInfo);

      if (!result || !result.access_token) {
        return res.status(500).json({ success: false, message: 'Failed to create guest token' });
      }

      const cookieOptions: any = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      };
      if (typeof result.expires_in === 'number' && result.expires_in > 0) {
        cookieOptions.maxAge = result.expires_in * 1000;
      }

      res.cookie('token', result.access_token, cookieOptions);

      return res.json({
        success: true,
        access_token: result.access_token,
        expires_in: result.expires_in,
        expired_at: result.expired_at,
        jti: result.jti,
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
  // @UseGuards(JwtAuthGuard)
  @Post('revoke/:jti')
  async revoke(@Param('jti') jti: string, @Req() req: Request) {
    const actor = (req as any).user;
    await this.authService.revokeTokenByJti(jti, actor);
    return { success: true };
  }




}
