import { Controller, Post, Req, Res, Body, Get, Param, UseGuards, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response, Request } from 'express';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { v4 as uuidv4 } from 'uuid';
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

  // @Post('login')
  // async login(@Body() body: LoginDto, @Req() req: Request, @Res() res: Response) {
  //   const user = await this.authService.validateUser(body.username, body.password);

  //   if (!user) {
  //     await this.authService.logLogin(null, false, req, 'Invalid credentials');
  //     return res.status(401).json({ message: 'Invalid credentials' });
  //   }

  //   // กำหนด expiresIn ตาม role
  //   let expiresIn: string | undefined = undefined;
  //   if (user.role !== 'admin') {
  //     expiresIn = '1d';
  //   }

  //   const token = this.authService.generateJwt({
  //     sub: user.id,
  //     username: user.username,
  //     role: user.role,
  //   }, expiresIn);

  //   // กำหนด expiredAt ตาม expiresIn
  //   let expiredAt: Date | null = null;
  //   if (expiresIn) {
  //     // รองรับ d, h, m, s
  //     function parseExpiresIn(str: string): number {
  //       const match = str.match(/^(\d+)([dhms])$/);
  //       if (!match) return 0;
  //       const value = parseInt(match[1], 10);
  //       switch (match[2]) {
  //         case 'd': return value * 24 * 60 * 60;
  //         case 'h': return value * 60 * 60;
  //         case 'm': return value * 60;
  //         case 's': return value;
  //         default: return 0;
  //       }
  //     }
  //     const expiresInSeconds = parseExpiresIn(expiresIn);
  //     expiredAt = new Date(Date.now() + expiresInSeconds * 1000);
  //   }

  //   // ส่ง expiredAt ถ้ามีค่า
  //   if (expiredAt) {
  //     await this.authService.saveToken(user, token, expiredAt);
  //   }

  //   await this.authService.logLogin(user, true, req);

  //   res.cookie('token', token, {
  //     httpOnly: true,
  //     secure: false,
  //     sameSite: 'strict',
  //   });
  //   return res.json({ access_token: token });
  // }

  @Post('login')
  async login(@Body() body: LoginDto, @Req() req: Request, @Res() res: Response) {
    const user = await this.authService.validateUser(body.username, body.password);
    if (!user) {
      await this.authService.logLogin(null, false, req, 'Invalid credentials');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // อ่านการตั้งค่าว่าจะให้ admin เป็น never-expire หรือไม่ (ENV)
    const adminNeverExpire = (process.env.ADMIN_NEVER_EXPIRE === 'true');

    // เลือก expires จาก env (configurable) — แต่ถ้า adminNeverExpire => no expires
    const userDefault = process.env.ACCESS_TOKEN_EXPIRES_IN || '1d';
    const adminDefault = process.env.ADMIN_ACCESS_TOKEN_EXPIRES_IN || '30d';
    let expiresIn: string | undefined = user.role === 'admin' ? adminDefault : userDefault;
    if (user.role === 'admin' && adminNeverExpire) {
      expiresIn = undefined; // no expiry in JWT sign (or treat separately)
    }
    // สร้าง jti แล้วใส่ใน payload
    const jti = uuidv4();
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      jti,
    };

    const token = this.authService.generateJwt(payload, expiresIn);

    // คำนวณ expiredAt (ถ้ามี)
    let expiredAt: Date | null = null;
    if (expiresIn) {
      function parseExpiresIn(str: string): number {
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
      }
      const expiresInSeconds = parseExpiresIn(expiresIn);
      expiredAt = new Date(Date.now() + expiresInSeconds * 1000);
    } else {
      // no expiry => keep expiredAt null
      expiredAt = null;
    }

    // บันทึก token เสมอ (saveToken ปรับให้เก็บ hash + jti)
    await this.authService.saveToken(user, token, expiredAt, jti, { isPermanent: user.role === 'admin' && adminNeverExpire });

    await this.authService.logLogin(user, true, req);

    const cookieOptions: any = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    };
    if (expiredAt) cookieOptions.maxAge = expiredAt.getTime() - Date.now();

    res.cookie('token', token, cookieOptions);
    return res.json({ access_token: token, expires_at: expiredAt, is_permanent: user.role === 'admin' && adminNeverExpire });
  }


  // ...existing code...
  @Post('guest')
  async loginAsGuest(@Res() res: Response) {
    try {
      const result = await this.authService.loginAsGuest();

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
    if (!body || !body.username || !body.password) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุ username และ password ใน request body'
      });
    }

    try {
      const result = await this.authService.getTokenByCredentials(body.username, body.password, req);

      // อย่า log token/password
      console.log('API Token Request for user:', body.username, 'success=', !!result.success);

      if (!result.success) {
        return res.status(401).json({
          success: false,
          message: result.message || 'Invalid credentials'
        });
      }

      return res.json({
        success: true,
        access_token: result.access_token,
        expires_in: result.expires_in,
        token_type: 'Bearer',
        user_role: result.user_role
      });
    } catch (err) {
      console.error('getApiToken error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
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




}
