// src/auth/auth.service.ts
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, MoreThan, Repository } from 'typeorm';
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
    // บัญชีที่ admin ปิดใช้งานต้อง login ไม่ได้ (เดิมไม่เช็ก — ปิดบัญชีแล้วยัง login ใหม่ได้)
    if (!user.isActive) return null;
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
    identity: any | null,
    rawToken: string | null,
    expiredAt: Date | null,
    jti?: string,
    opts?: { isPermanent?: boolean; tokenType?: string; deviceInfo?: any; actorType?: 'user' | 'patient'; sessionId?: string },
  ) {
    try {
      const tokenHash = rawToken ? this.hashToken(rawToken) : null;
      const finalJti = jti ?? uuidv4();
      const actorType = opts?.actorType ?? 'user';

      // normalize + clean deviceInfo to avoid storing null fields
      const rawDeviceInfo = opts?.deviceInfo ?? null;
      const cleaned = rawDeviceInfo ? this.cleanObject(rawDeviceInfo) : undefined;
      const deviceInfo = cleaned ?? null;

      const deviceIp = deviceInfo?.ip ?? null;
      const fp = deviceInfo?.fingerprint ?? null;
      const fingerprintHash = fp ? this.hashToken(fp) : null;

      const tokenPartial = this.userTokenRepo.create({
        ...(identity
          ? actorType === 'patient'
            ? { patient: { id: identity.id } as any }
            : { user: { id: identity.id } as any }
          : {}),
        tokenHash,
        jti: finalJti,
        tokenType: opts?.tokenType ?? 'access',
        sessionId: opts?.sessionId ?? null,
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
    identity: { id: string | number; username?: string; role: string; first_name?: string; last_name?: string; name?: string },
    rememberMe: boolean,
    deviceInfo?: any,
    actorType: 'user' | 'patient' = 'user',
  ) {
    const accessExpiresIn = Config.token.resolveAccessExpiry(identity.role, rememberMe);
    const isPermanent = accessExpiresIn === undefined; // admin + ADMIN_ACCESS_TOKEN_EXPIRES_IN=0
    const accessJti = uuidv4();
    // ชื่อที่แสดงบนหัวเว็บ — ใส่ใน token ให้หน้าเว็บแสดงได้ทันทีหลัง login
    const name =
      [identity.first_name, identity.last_name].filter(Boolean).join(' ').trim() || identity.name || identity.username;
    const accessToken = this.generateJwt(
      { sub: identity.id, username: identity.username, name, role: identity.role, jti: accessJti },
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
        actorType,
        sessionId: refreshJti,
      }),
      this.saveToken({ id: identity.id }, refreshToken, refreshExpiredAt, refreshJti, {
        deviceInfo,
        tokenType: 'refresh',
        actorType,
        sessionId: refreshJti,
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
  // exceptJtis: เว้น token ที่ใช้อยู่ (เช่น เปลี่ยนรหัสผ่านตัวเอง → ออกจากเครื่องอื่น แต่เครื่องนี้ยังใช้ต่อได้)
  // คืนจำนวน "อุปกรณ์" ที่ออกจากระบบ (นับจาก refresh token — 1 อุปกรณ์มี access + refresh คู่กัน)
  async revokeAllTokensOfUser(userId: string, opts?: { revokedBy?: string; reason?: string; exceptJtis?: string[] }): Promise<number> {
    if (!userId) return 0;
    const except = (opts?.exceptJtis ?? []).filter(Boolean);
    // refresh ก่อน (นับจำนวนอุปกรณ์จากตรงนี้) แล้วตามด้วย token ที่เหลือ
    const revoke = (refreshOnly: boolean) => {
      const qb = this.userTokenRepo.createQueryBuilder()
        .update()
        .set({
          revoked: true,
          revokedAt: new Date(),
          revokedBy: opts?.revokedBy ?? undefined,
          revokedReason: opts?.reason ?? undefined,
        })
        .where('"userId" = :userId', { userId })
        .andWhere('revoked = false');
      if (refreshOnly) qb.andWhere(`token_type = 'refresh'`);
      if (except.length) qb.andWhere('(jti IS NULL OR jti NOT IN (:...except))', { except });
      return qb.execute();
    };
    const devices = (await revoke(true)).affected ?? 0;
    await revoke(false);
    return devices;
  }

  // ===== อุปกรณ์ที่ login (session) =====
  // 1 session = refresh token 1 ตัว + access token ที่ออกคู่กันใน issueTokenPair (session_id เดียวกัน = jti ของ refresh)
  // ต้อง revoke refresh ด้วย — ไม่งั้นอุปกรณ์นั้นแค่ refresh แล้วกลับมาใช้ต่อได้
  // token รุ่นเก่าที่ไม่มี session_id: จับคู่จากเวลาที่ออก (ห่างกันไม่กี่ ms) แทน
  private static readonly LEGACY_PAIR_WINDOW_MS = 2000;

  // jti ของ refresh token ในอุปกรณ์เดียวกับ access token นี้
  async findRefreshJtiOfAccess(userId: string, accessJti: string): Promise<string | null> {
    const access = await this.userTokenRepo.findOne({ where: { jti: accessJti, user: { id: userId } as any } });
    if (!access) return null;
    if (access.sessionId) return access.sessionId;
    const at = new Date(access.created_at).getTime();
    const rows = await this.userTokenRepo.find({
      select: ['jti', 'created_at'] as any,
      where: { user: { id: userId } as any, tokenType: 'refresh', sessionId: IsNull(), created_at: this.legacyWindow(access.created_at) as any },
    });
    rows.sort((a, b) => Math.abs(new Date(a.created_at).getTime() - at) - Math.abs(new Date(b.created_at).getTime() - at));
    return rows[0]?.jti ?? null;
  }

  private legacyWindow(createdAt: Date) {
    const t = new Date(createdAt).getTime();
    return Between(new Date(t - AuthService.LEGACY_PAIR_WINDOW_MS), new Date(t + AuthService.LEGACY_PAIR_WINDOW_MS));
  }

  async listSessions(userId: string, currentAccessJti?: string) {
    const base = { user: { id: userId } as any, tokenType: 'refresh', revoked: false };
    const rows = await this.userTokenRepo.find({
      select: ['id', 'jti', 'created_at', 'last_used', 'expired_at', 'deviceInfo', 'deviceIp'] as any,
      // ยังไม่หมดอายุ (null = ไม่มีวันหมดอายุ)
      where: [
        { ...base, expired_at: MoreThan(new Date()) },
        { ...base, expired_at: IsNull() },
      ],
      order: { created_at: 'DESC' },
    });
    const currentJti = currentAccessJti ? await this.findRefreshJtiOfAccess(userId, currentAccessJti) : null;
    return rows
      .map((r) => ({
        id: r.id,
        created_at: r.created_at,
        last_used: r.last_used,
        expired_at: r.expired_at,
        deviceInfo: r.deviceInfo,
        deviceIp: r.deviceIp,
        current: r.jti === currentJti,
      }))
      .sort((a, b) => Number(b.current) - Number(a.current));
  }

  // ออกจากระบบ session ของตัวเอง (id = แถว refresh token)
  async revokeSession(userId: string, sessionRowId: string) {
    const refresh = await this.userTokenRepo.findOne({ where: { id: sessionRowId, tokenType: 'refresh', user: { id: userId } as any } });
    if (!refresh) throw new NotFoundException('ไม่พบอุปกรณ์นี้');
    const set = { revoked: true, revokedAt: new Date(), revokedBy: userId, revokedReason: 'session revoked by owner' };
    const owner = { user: { id: userId } as any, revoked: false };
    if (refresh.sessionId) {
      await this.userTokenRepo.update({ ...owner, sessionId: refresh.sessionId }, set);
    } else {
      await this.userTokenRepo.update({ id: refresh.id }, set);
      await this.userTokenRepo.update({ ...owner, tokenType: 'access', sessionId: IsNull(), created_at: this.legacyWindow(refresh.created_at) as any }, set);
    }
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

  // เหมือน logLogin แต่สำหรับ patient (phone+OTP) — ใช้ตาราง login_logs เดียวกัน
  async logPatientLogin(patient: any | null, success: boolean, req: any, failReason?: string) {
    await this.loginLogRepo.save({
      patient: patient || undefined,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      success,
      fail_reason: failReason || undefined,
    } as any);
  }

  // ...existing code...
  async findSessionsForUser(userId: string) {
    if (!userId) return [];
    return this.userTokenRepo.find({
      // ห้าม relations: ['user'] / tokenHash — เดิมส่ง password_hash ของ user และ hash ของ token กลับไปที่หน้าเว็บ
      where: { user: { id: userId } as any },
      order: { created_at: 'DESC' },
      select: ['id', 'jti', 'tokenType', 'expired_at', 'revoked', 'last_used', 'created_at', 'is_permanent', 'deviceInfo', 'deviceIp'] as any,
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


