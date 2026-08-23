// src/auth/auth.service.ts
import { ForbiddenException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// Update the import path to the correct location of user.entity.ts
import * as bcrypt from 'bcrypt';
import { User } from '../../database/entities/user.entity';
import { UserService } from '../user/user.service';
import { UserToken } from '../../database/entities/user-token.entity';
import { LoginLog } from '../../database/entities/login-log.entity';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { Config } from '../../config';


@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private userService: UserService, // inject service
    @InjectRepository(UserToken) private userTokenRepo: Repository<UserToken>,
    @InjectRepository(LoginLog) private loginLogRepo: Repository<LoginLog>,
  ) { }

  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.userService.findByUsername(username);
    if (!user) return null;
    const isMatch = await bcrypt.compare(password, user.password_hash);
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
  // ...existing code...
  // helper: remove null/undefined recursively (returns undefined for empty result)
  private cleanObject(obj: any): any {
    if (obj === null || obj === undefined) return undefined;
    if (Array.isArray(obj)) {
      const a = obj.map((v) => this.cleanObject(v)).filter((v) => v !== undefined);
      return a.length ? a : undefined;
    }
    if (typeof obj === 'object') {
      const out: any = {};
      for (const k of Object.keys(obj)) {
        const v = this.cleanObject(obj[k]);
        if (v !== undefined) out[k] = v;
      }
      return Object.keys(out).length ? out : undefined;
    }
    return obj;
  }

  async saveToken(
    user: any | null,
    rawToken: string | null,
    expiredAt: Date | null,
    jti?: string,
    opts?: { isPermanent?: boolean; tokenType?: string; deviceInfo?: any },
  ) {
    try {
      const tokenHash = rawToken ? this.hashToken(rawToken) : null;
      const finalJti = jti ?? uuidv4();

      // normalize + clean deviceInfo to avoid storing null fields
      const rawDeviceInfo = opts?.deviceInfo ?? null;
      const cleaned = rawDeviceInfo ? this.cleanObject(rawDeviceInfo) : undefined;
      const deviceInfo = cleaned ?? null;

      const deviceIp = deviceInfo?.ip ?? null;
      const fp = deviceInfo?.fingerprint ?? null;
      const fingerprintHash = fp ? this.hashToken(fp) : null;
        
      const tokenPartial = this.userTokenRepo.create({
        ...(user ? { user: { id: user.id } as any } : {}),
        tokenHash,
        jti: finalJti,
        tokenType: opts?.tokenType ?? 'access',
        deviceInfo: deviceInfo ?? null,
        deviceIp: deviceIp ?? null,
        fingerprint: fingerprintHash,
        expired_at: expiredAt ?? null,
        is_permanent: !!opts?.isPermanent,
        revoked: false,
      } as any);

      await this.userTokenRepo.save(tokenPartial);

      return finalJti;
    } catch (err) {
      console.error('[saveToken] error saving token:', err);
      throw err;
    }
  }
  // ...existing code...

  // ออก access + refresh token คู่กันแล้ว save ทั้งคู่ลง DB ในที่เดียว
  // (เดิม login() กับ refresh() ต่างก็เขียน jti/payload/expiry/saveToken เองซ้ำกันทั้งสองจุด)
  async issueTokenPair(
    identity: { id: string; username?: string; role: string },
    rememberMe: boolean,
    deviceInfo?: any,
  ) {
    const accessExpiresIn = Config.token.resolveAccessExpiry(identity.role, rememberMe);
    const isPermanent = accessExpiresIn === undefined; // admin + ADMIN_ACCESS_TOKEN_EXPIRES_IN=0
    const accessJti = uuidv4();
    const accessToken = this.generateJwt(
      { sub: identity.id, username: identity.username, role: identity.role, jti: accessJti },
      accessExpiresIn,
    );
    const accessExpiresInSeconds = Config.token.parseExpiresIn(accessExpiresIn);
    const accessExpiredAt = accessExpiresInSeconds > 0 ? new Date(Date.now() + accessExpiresInSeconds * 1000) : null;

    const refreshExpiresIn = rememberMe
      ? Config.token.REFRESH_TOKEN_REMEMBER_ME_EXPIRES_IN
      : Config.token.REFRESH_TOKEN_EXPIRES_IN;
    const refreshJti = uuidv4();
    const refreshToken = await this.generateRefreshToken(
      { sub: identity.id, username: identity.username, role: identity.role, jti: refreshJti, remember: rememberMe },
      refreshExpiresIn,
    );
    const refreshExpiresInSeconds = Config.token.parseExpiresIn(refreshExpiresIn);
    const refreshExpiredAt = new Date(Date.now() + refreshExpiresInSeconds * 1000);

    await Promise.all([
      this.saveToken({ id: identity.id }, accessToken, accessExpiredAt, accessJti, {
        deviceInfo,
        tokenType: 'access',
        isPermanent,
      }),
      this.saveToken({ id: identity.id }, refreshToken, refreshExpiredAt, refreshJti, {
        deviceInfo,
        tokenType: 'refresh',
      }),
    ]);

    return {
      accessToken,
      accessJti,
      accessExpiresInSeconds,
      accessExpiredAt,
      isPermanent,
      refreshToken,
      refreshJti,
      refreshExpiresInSeconds,
      refreshExpiredAt,
    };
  }

  async revokeToken(rawTokenOrJti: string, opts?: { revokedBy?: string; reason?: string }) {
    try {
      const patch = {
        revoked: true,
        revokedAt: new Date(),
        revokedBy: opts?.revokedBy ?? undefined,
        revokedReason: opts?.reason ?? undefined,
      };

      // ถ้าเป็น JWT ให้ decode เพื่อหาค่า jti
      let jti: string | null = null;
      try {
        const decoded: any = this.jwtService.decode(rawTokenOrJti) as any;
        if (decoded?.jti) jti = decoded.jti;
      } catch (e) { /* ignore */ }

      if (jti) {
        await this.userTokenRepo.update({ jti }, patch);
        return;
      }

      // ถ้าไม่ใช่ jti ให้เช็คแบบ hash (หรือ fallback เป็น token ดิบ)
      const hash = this.hashToken(rawTokenOrJti);
      // update by token_hash (no raw token column)
      await this.userTokenRepo.createQueryBuilder()
        .update()
        .set(patch)
        .where('token_hash = :hash', { hash })
        .execute();

      // ถ้าต้องการ สามารถเช็ค result.affected เพื่อโลกการทำงาน
    } catch (err) {
      console.error('revokeToken error:', err);
      throw err;
    }
  }

  // revoke all tokens for a given userId, return number of rows affected
  async revokeAllTokensOfUser(userId: string, opts?: { revokedBy?: string; reason?: string }): Promise<number> {
    if (!userId) return 0;
    const result = await this.userTokenRepo.createQueryBuilder()
      .update()
      .set({
        revoked: true,
        revokedAt: new Date(),
        revokedBy: opts?.revokedBy ?? undefined,
        revokedReason: opts?.reason ?? undefined,
      })
      .where('"userId" = :userId', { userId })
      .andWhere('revoked = false')
      .execute();
    return result.affected ?? 0;
  }

  // auth.service.ts
  async loginAsGuest(deviceInfo: any) {
    const jti = uuidv4();

    const payload = {
      sub: `guest_${jti}`,
      role: 'guest',
      is_guest: true,
      jti,
    };

    const expiresIn = '15m';

    const accessToken = this.generateJwt(payload, expiresIn);

    const expiresInSeconds = 15 * 60;
    const expiredAt = new Date(Date.now() + expiresInSeconds * 1000);

    await this.saveToken(null, accessToken, expiredAt, jti, {
      deviceInfo,
      tokenType: 'access',
    });

    return {
      access_token: accessToken,
      expires_in: expiresInSeconds,
      expired_at: expiredAt,
      jti,
    };
  }

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

  // ...existing code...
  // now accept deviceInfo and pass it to saveToken
  async getTokenByCredentials(username: string, password: string, req: any, deviceInfo?: any) {
    try {
      if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
        await this.logApiKeyUsage(null, false, req, 'Username or password is missing or invalid type');
        return { success: false, message: 'Username และ Password จำเป็นต้องระบุ' };
      }

      const apiUser = await this.userService.findByUsername(username);
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

      const jti = uuidv4();
      const payload = {
        sub: apiUser.id,
        username: apiUser.username,
        role: apiUser.role,
        api_token: true,
        jti,
      };

      const expiresIn = Config.token.API_TOKEN_EXPIRES_IN;
      const token = this.jwtService.sign(payload, { expiresIn });

      const expiresInSeconds = Config.token.parseExpiresIn(expiresIn);
      const expiredAt = expiresInSeconds > 0 ? new Date(Date.now() + expiresInSeconds * 1000) : null;

      // save token with deviceInfo (token_hash + jti stored)
      await this.saveToken(apiUser, token, expiredAt, jti, { tokenType: 'api', deviceInfo });

      await this.logApiKeyUsage(apiUser, true, req);

      return {
        success: true,
        access_token: token,
        expires_in: expiresInSeconds,
        expired_at: expiredAt ? expiredAt.toISOString() : null,
        jti,
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
      select: ['id', 'jti', 'tokenHash', 'tokenType', 'expired_at', 'revoked', 'last_used', 'created_at', 'is_permanent', 'deviceInfo', 'deviceIp'] as any,
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
      throw new ForbiddenException('Not allowed to revoke this token');
    }

    await this.userTokenRepo.update(
      { jti },
      { revoked: true, revokedAt: new Date(), revokedBy: actorId ?? undefined, revokedReason: 'manual_revoke' },
    );
  }


  async touchLastUsed(tokenId: string) {
    try {
      await this.userTokenRepo.update({ id: tokenId }, { last_used: new Date() });
    } catch (e) {
      // ignore
    }
  }
  // ...existing code...


  async verifyRefreshToken(token: string) {
    return this.jwtService.verify(token, {
      secret: process.env.JWT_REFRESH_SECRET,
    });
  }

  async generateRefreshToken(payload: any, expiresIn: string) {
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn,
    });
  }

  async isRefreshTokenValid(jti: string) {
    const token = await this.userTokenRepo.findOne({ where: { jti, tokenType: 'refresh' } });

    if (!token) return false;
    if (token.revoked) return false;
    if (token.expired_at && new Date(token.expired_at) < new Date()) return false;

    return true;
  }

  async revokeRefreshTokenByJti(jti: string) {
    if (!jti) return;

    await this.userTokenRepo.update(
      { jti, tokenType: 'refresh' },
      { revoked: true, revokedAt: new Date(), revokedReason: 'rotated' },
    );
  }

}


