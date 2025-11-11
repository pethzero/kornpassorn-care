// src/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// Update the import path to the correct location of user.entity.ts
import { User } from '../../database/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../../database/database.service';
import { UserToken } from '../../database/entities/user-token.entity';
import { LoginLog } from '../../database/entities/login-log.entity';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';


@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private databaseService: DatabaseService, // inject service
    @InjectRepository(UserToken) private userTokenRepo: Repository<UserToken>,
    @InjectRepository(LoginLog) private loginLogRepo: Repository<LoginLog>,
  ) { }

  async validateUser(username: string, password: string): Promise<User | null> {
    console.log('Validating user:', username);
    const user = await this.databaseService.findUserByUsername(username);

    if (!user) return null;
    const isMatch = await bcrypt.compare(password, user.password_hash);
    console.log('Password match:', isMatch);
    if (!isMatch) return null;
    return user;
  }

  generateJwt(payload: any, expiresIn?: string): string {
    if (expiresIn) {
      return this.jwtService.sign(payload, { expiresIn });
    }
    return this.jwtService.sign(payload);
  }

  // helper: hash token
  private hashToken(raw: string) {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  // ปรับให้รับ user เป็น nullable (guest => null)
  async saveToken(
    user: User | null,
    rawToken: string | null,
    expiredAt: Date | null,
    jti?: string,
    opts?: { isPermanent?: boolean; tokenType?: string; deviceInfo?: any },
  ) {
    try {
      const tokenHash = rawToken ? this.hashToken(rawToken) : null;
      const finalJti = jti ?? uuidv4();

      // ...existing code...
      const tokenPartial = this.userTokenRepo.create({
        ...(user ? { user: { id: user.id } as any } : {}),
        // don't reference raw token column (removed)
        tokenHash,
        jti: finalJti,
        tokenType: opts?.tokenType ?? 'access',
        deviceInfo: opts?.deviceInfo ?? null,
        expired_at: expiredAt ?? null,
        is_permanent: !!opts?.isPermanent,
        revoked: false,
      } as unknown as Partial<UserToken>);

      const saved = await this.userTokenRepo.save(tokenPartial);
      console.log('[saveToken] saved id=', (saved as any).id, 'jti=', finalJti);
      return finalJti;
    } catch (err) {
      console.error('[saveToken] error saving token:', err);
      throw err;
    }
  }

  async revokeToken(rawTokenOrJti: string) {
    try {
      // ถ้าเป็น JWT ให้ decode เพื่อหาค่า jti
      let jti: string | null = null;
      try {
        const decoded: any = this.jwtService.decode(rawTokenOrJti) as any;
        if (decoded?.jti) jti = decoded.jti;
      } catch (e) { /* ignore */ }

      if (jti) {
        await this.userTokenRepo.update({ jti }, { revoked: true });
        return;
      }

      // ถ้าไม่ใช่ jti ให้เช็คแบบ hash (หรือ fallback เป็น token ดิบ)
      const hash = this.hashToken(rawTokenOrJti);
      // update by token_hash (no raw token column)
      await this.userTokenRepo.createQueryBuilder()
        .update()
        .set({ revoked: true })
        .where('token_hash = :hash', { hash })
        .execute();

      // ถ้าต้องการ สามารถเช็ค result.affected เพื่อโลกการทำงาน
    } catch (err) {
      console.error('revokeToken error:', err);
      throw err;
    }
  }

  // revoke all tokens for a given userId, return number of rows affected
  async revokeAllTokensOfUser(userId: string): Promise<number> {
    if (!userId) return 0;
    const result = await this.userTokenRepo.createQueryBuilder()
      .update()
      .set({ revoked: true })
      .where('"userId" = :userId', { userId })
      .execute();
    return result.affected ?? 0;
  }
  
  // auth.service.ts
  // เพิ่ม/แก้ loginAsGuest ให้สร้าง jti, เก็บ token (type=guest) แล้วคืนค่า
  async loginAsGuest() {
    const expiresIn = process.env.GUEST_EXPIRES_IN || '1h'; // default 1 hour
    const jti = uuidv4();
    // unique guest subject (not linked to users table)
    const guestSub = `guest-${jti}`;

    const payload = {
      sub: guestSub,
      username: 'guest',
      role: 'guest',
      jti,
    };

    const token = this.jwtService.sign(payload, { expiresIn });

    function parseExpiresIn(str: string): number {
      const match = str.match(/^(\d+)([dhms])$/);
      if (!match) return 0;
      const v = parseInt(match[1], 10);
      switch (match[2]) {
        case 'd': return v * 24 * 60 * 60;
        case 'h': return v * 60 * 60;
        case 'm': return v * 60;
        case 's': return v;
        default: return 0;
      }
    }

    const expiresInSeconds = parseExpiresIn(expiresIn);
    const expiredAt = expiresInSeconds > 0 ? new Date(Date.now() + expiresInSeconds * 1000) : null;

    // save as guest (user = null), tokenType = 'guest'
    await this.saveToken(null, token, expiredAt, jti, { tokenType: 'guest' });

    return {
      access_token: token,
      expires_in: expiresInSeconds,
      expired_at: expiredAt ? expiredAt.toISOString() : null,
      jti,
    };
  }
  // ...existing code...


  // บันทึก log ทุกครั้งที่ login (สำเร็จ/ล้มเหลว)
  async logLogin(user: User | null, success: boolean, req: any, failReason?: string) {
    await this.loginLogRepo.save({
      user: user || undefined, // ใช้ undefined แทน null
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      success,
      fail_reason: failReason || undefined,
    });
  }


  // // หลัง login สำเร็จ
  // async saveToken(user: User, token: string, jti: string, expiredAt: Date | null, expiredAt: Date) {
  //   await this.userTokenRepo.save({
  //     user,
  //     token,
  //     expired_at: expiredAt,
  //     revoked: false,
  //   });
  // }

  // // logout
  // async revokeToken(token: string) {
  //   await this.userTokenRepo.update({ token }, { revoked: true });
  // }

  // async revokeAllTokensOfUser(userId: string) {
  //   await this.userTokenRepo.update({ user: { id: userId } }, { revoked: true });
  // }

  // ✅ API สำหรับขอ token ด้วย username/password (สำหรับ API users)
  // async getTokenByCredentials(username: string, password: string, req: any) {
  //   try {
  //     // ตรวจสอบ username และ password ว่าถูกส่งมาหรือไม่
  //     if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
  //       await this.logApiKeyUsage(null, false, req, 'Username or password is missing or invalid type');
  //       return {
  //         success: false,
  //         message: 'Username และ Password จำเป็นต้องระบุ'
  //       };
  //     }

  //     // หา API user ในฐานข้อมูล
  //     const apiUser = await this.databaseService.findUserByUsername(username);

  //     if (!apiUser || apiUser.role !== 'api') {
  //       await this.logApiKeyUsage(null, false, req, 'API user not found or invalid role');
  //       return {
  //         success: false,
  //         message: 'API user ไม่ถูกต้องหรือไม่มีสิทธิ์'
  //       };
  //     }

  //     if (!apiUser.isActive) {
  //       await this.logApiKeyUsage(apiUser, false, req, 'API user is inactive');
  //       return {
  //         success: false,
  //         message: 'API user ถูกปิดการใช้งาน'
  //       };
  //     }

  //     // ตรวจสอบ password
  //     const isPasswordValid = await bcrypt.compare(password, apiUser.password_hash);
  //     if (!isPasswordValid) {
  //       await this.logApiKeyUsage(apiUser, false, req, 'Invalid password');
  //       return {
  //         success: false,
  //         message: 'Password ไม่ถูกต้อง'
  //       };
  //     }

  //     console.log('Login')
  //     // สร้าง JWT token
  //     const payload = {
  //       sub: apiUser.id,
  //       username: apiUser.username,
  //       role: apiUser.role,
  //       api_token: true, // ระบุว่าเป็น token จาก API credentials
  //     };

  //     const expiresIn = '24h'; // API token อายุ 24 ชั่วโมง
  //     const token = this.jwtService.sign(payload, { expiresIn });

  //     // แปลง expiresIn เป็นวินาที (รองรับ h, d, m)
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

  //     // บันทึก token
  //     const expiredAt = new Date(Date.now() + expiresInSeconds * 1000);
  //     await this.saveToken(apiUser, token, expiredAt);

  //     // บันทึก log สำเร็จ
  //     await this.logApiKeyUsage(apiUser, true, req);

  //     return {
  //       success: true,
  //       access_token: token,
  //       expires_in: expiresInSeconds,
  //       user_role: apiUser.role
  //     };

  //   } catch (error) {
  //     console.error('Error in getTokenByCredentials:', error);
  //     await this.logApiKeyUsage(null, false, req, `System error: ${error.message}`);
  //     return {
  //       success: false,
  //       message: 'เกิดข้อผิดพลาดภายในระบบ'
  //     };
  //   }
  // }


  // ...existing code...
  async getTokenByCredentials(username: string, password: string, req: any) {
    try {
      if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
        await this.logApiKeyUsage(null, false, req, 'Username or password is missing or invalid type');
        return { success: false, message: 'Username และ Password จำเป็นต้องระบุ' };
      }

      const apiUser = await this.databaseService.findUserByUsername(username);
      if (!apiUser || apiUser.role !== 'api') {
        await this.logApiKeyUsage(null, false, req, 'API user not found or invalid role');
        return { success: false, message: 'API user ไม่ถูกต้องหรือไม่มีสิทธิ์' };
      }
      if (!apiUser.isActive) {
        await this.logApiKeyUsage(apiUser, false, req, 'API user is inactive');
        return { success: false, message: 'API user ถูกปิดการใช้งาน' };
      }

      const isPasswordValid = await bcrypt.compare(password, apiUser.password_hash);
      if (!isPasswordValid) {
        await this.logApiKeyUsage(apiUser, false, req, 'Invalid password');
        return { success: false, message: 'Password ไม่ถูกต้อง' };
      }

      // สร้าง jti และ payload (ไม่ log token)
      const jti = uuidv4();
      const payload = {
        sub: apiUser.id,
        username: apiUser.username,
        role: apiUser.role,
        api_token: true,
        jti,
      };

      const expiresIn = process.env.API_TOKEN_EXPIRES_IN || '20s';
      const token = this.jwtService.sign(payload, { expiresIn });

      // แปลง expiresIn เป็นวินาที (รองรับ d,h,m,s)
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
      const expiredAt = new Date(Date.now() + expiresInSeconds * 1000);

      // บันทึก token (เก็บ hash + jti). ระบุ tokenType ให้เป็น 'api'
      await this.saveToken(apiUser, token, expiredAt, jti, { tokenType: 'api' });

      await this.logApiKeyUsage(apiUser, true, req);

      return {
        success: true,
        access_token: token,
        expires_in: expiresInSeconds,
        expired_at: expiredAt.toISOString(),
        user_role: apiUser.role
      };
    } catch (error) {
      console.error('Error in getTokenByCredentials:', error);
      await this.logApiKeyUsage(null, false, req, `System error: ${error?.message || error}`);
      return { success: false, message: 'เกิดข้อผิดพลาดภายในระบบ' };
    }
  }
  // ...existing code...
  // บันทึก log การใช้ API key
  async logApiKeyUsage(user: User | null, success: boolean, req: any, failReason?: string) {
    await this.loginLogRepo.save({
      user: user || undefined,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      success,
      fail_reason: failReason || undefined,
    });
  }



  // ...existing code...
  async findSessionsForUser(userId: string) {
    if (!userId) return [];
    return this.userTokenRepo.find({
      where: { user: { id: userId } as any },
      relations: ['user'],
      order: { created_at: 'DESC' },
      select: ['id', 'jti', 'tokenHash', 'tokenType', 'expired_at', 'revoked', 'last_used', 'created_at', 'is_permanent'] as any,
    });
  }

  // revoke by jti (with permission check)
  async revokeTokenByJti(jti: string, actor: any) {
    if (!jti) return;
    const token = await this.userTokenRepo.findOne({ where: { jti }, relations: ['user'] });
    if (!token) return;

    const ownerId = token.user?.id;
    const actorId = actor?.userId ?? actor?.sub;
    const actorRole = actor?.role;

    if (actorRole !== 'admin' && ownerId !== actorId) {
      throw new Error('Not allowed to revoke this token');
    }

    await this.userTokenRepo.update({ jti }, { revoked: true });
  }


  async touchLastUsed(tokenId: string) {
    try {
      await this.userTokenRepo.update({ id: tokenId }, { last_used: new Date() });
    } catch (e) {
      // ignore
    }
  }
  // ...existing code...

}


