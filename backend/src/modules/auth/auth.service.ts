// src/auth/auth.service.ts
import { BadRequestException, Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request, Response } from 'express';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../database/entities/user.entity';
import { Patient } from '../../database/entities/medical.entity';
import { UserService } from '../user/user.service';
import { UserToken } from '../../database/entities/user-token.entity';
import { LoginLog } from '../../database/entities/login-log.entity';
import { Config } from '../../config';
import { cleanObject, describeDevice, describeUserAgent, getClientIp } from '../../utils/device.util';

type Identity = { id: string | number; username?: string; role: string; first_name?: string; last_name?: string; name?: string };
type Actor = { user?: User | null; patient?: Patient | null };
type RevokeBy = { revokedBy?: string | null; reason: string };

// "ออนไลน์" = มีการเรียก API ภายในช่วงนี้ (JwtStrategy บันทึก last_used ทุก ~1 นาทีที่ใช้งาน)
export const ONLINE_WINDOW_MS = 5 * 60 * 1000;
const GUEST_TTL_SECONDS = 15 * 60;

// 1 session (อุปกรณ์ 1 เครื่องที่ login) = ทุก token ที่ session_id เดียวกัน
//   login → ออก access + refresh คู่แรก, session_id ใหม่
//   refresh → หมุน token ใหม่ แต่ session_id เดิม (ประวัติอุปกรณ์/เวลาที่ login ไม่หาย)
//   ออกจากระบบ / ถูกเตะ → revoke ทุกแถวของ session_id นั้น (access + refresh) → เครื่องนั้นต่ออายุไม่ได้อีก
@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private jwtService: JwtService,
    private userService: UserService,
    @InjectRepository(UserToken) private userTokenRepo: Repository<UserToken>,
    @InjectRepository(LoginLog) private loginLogRepo: Repository<LoginLog>,
  ) {}

  // token รุ่นก่อนมี session_id: refresh/guest ใช้ jti ของตัวเองเป็น session (access เก่าจะโดน JwtStrategy ปฏิเสธ
  // → หน้าเว็บ refresh เอง → ได้ token ชุดใหม่ใน session เดิม ไม่ต้อง login ใหม่) — รันซ้ำได้ ไม่มีอะไรเปลี่ยนถ้าไม่มี
  async onModuleInit() {
    await this.userTokenRepo
      .createQueryBuilder()
      .update()
      .set({ sessionId: () => 'jti' })
      .where('session_id IS NULL AND jti IS NOT NULL')
      .andWhere(`(token_type = 'refresh' OR ("userId" IS NULL AND "patientId" IS NULL))`)
      .execute()
      .catch(() => undefined);
  }

  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.userService.findByUsername(username);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return null;
    // บัญชีที่ admin ปิดใช้งานต้อง login ไม่ได้
    return user.isActive ? user : null;
  }

  // ===== ออก token =====

  private hashToken(raw: string) {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  private async saveToken(
    owner: { userId?: string | number; patientId?: string | number } | null,
    rawToken: string,
    jti: string,
    opts: { tokenType: 'access' | 'refresh'; sessionId: string; expiredAt: Date | null; isPermanent?: boolean; deviceInfo?: any },
  ) {
    const deviceInfo = cleanObject(opts.deviceInfo) ?? null;
    await this.userTokenRepo.save(
      this.userTokenRepo.create({
        ...(owner?.userId ? { user: { id: owner.userId } as any } : {}),
        ...(owner?.patientId ? { patient: { id: owner.patientId } as any } : {}),
        tokenHash: this.hashToken(rawToken),
        jti,
        tokenType: opts.tokenType,
        sessionId: opts.sessionId,
        deviceInfo,
        deviceIp: deviceInfo?.ip ?? null,
        expired_at: opts.expiredAt ?? undefined,
        is_permanent: !!opts.isPermanent,
        revoked: false,
      }),
    );
  }

  // access + refresh คู่กัน — sessionId ส่งมาตอน refresh (คง session เดิม), ไม่ส่ง = login ใหม่
  async issueTokenPair(identity: Identity, rememberMe: boolean, deviceInfo?: any, actorType: 'user' | 'patient' = 'user', sessionId?: string) {
    const accessExpiresIn = Config.token.resolveAccessExpiry(identity.role, rememberMe);
    const isPermanent = accessExpiresIn === undefined; // admin + ADMIN_ACCESS_TOKEN_EXPIRES_IN=0
    const accessJti = uuidv4();
    const refreshJti = uuidv4();
    const sid = sessionId ?? refreshJti;
    // เวลาที่เริ่ม session (login) — refresh ส่ง deviceInfo เดิมมา login_at จึงคงค่าเดิม
    deviceInfo = { login_at: new Date().toISOString(), ...(deviceInfo ?? {}) };
    // ชื่อที่แสดงบนหัวเว็บ — ใส่ใน token ให้หน้าเว็บแสดงได้ทันทีหลัง login
    const name = [identity.first_name, identity.last_name].filter(Boolean).join(' ').trim() || identity.name || identity.username;

    const accessToken = this.jwtService.sign(
      { sub: identity.id, username: identity.username, name, role: identity.role, jti: accessJti },
      accessExpiresIn ? { expiresIn: accessExpiresIn } : undefined,
    );
    const accessExpiresInSeconds = Config.token.parseExpiresIn(accessExpiresIn);
    const accessExpiredAt = accessExpiresInSeconds > 0 ? new Date(Date.now() + accessExpiresInSeconds * 1000) : null;

    const refreshExpiresIn = rememberMe ? Config.token.REFRESH_TOKEN_REMEMBER_ME_EXPIRES_IN : Config.token.REFRESH_TOKEN_EXPIRES_IN;
    const refreshToken = this.jwtService.sign(
      { sub: identity.id, username: identity.username, role: identity.role, jti: refreshJti, remember: rememberMe },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: refreshExpiresIn },
    );
    const refreshExpiresInSeconds = Config.token.parseExpiresIn(refreshExpiresIn);

    const owner = actorType === 'patient' ? { patientId: identity.id } : { userId: identity.id };
    await Promise.all([
      this.saveToken(owner, accessToken, accessJti, { tokenType: 'access', sessionId: sid, expiredAt: accessExpiredAt, isPermanent, deviceInfo }),
      this.saveToken(owner, refreshToken, refreshJti, {
        tokenType: 'refresh',
        sessionId: sid,
        expiredAt: new Date(Date.now() + refreshExpiresInSeconds * 1000),
        deviceInfo,
      }),
    ]);

    return { accessToken, accessJti, accessExpiresInSeconds, accessExpiredAt, isPermanent, refreshToken, refreshExpiresInSeconds, sessionId: sid };
  }

  // guest = access token อย่างเดียว 15 นาที (ไม่มี refresh) — มี session_id ให้ admin เห็น/เตะได้เหมือนคนอื่น
  async issueGuestToken(deviceInfo: any) {
    const jti = uuidv4();
    const accessToken = this.jwtService.sign({ sub: `guest_${jti}`, role: 'guest', is_guest: true, jti }, { expiresIn: GUEST_TTL_SECONDS });
    const expiredAt = new Date(Date.now() + GUEST_TTL_SECONDS * 1000);
    await this.saveToken(null, accessToken, jti, {
      tokenType: 'access',
      sessionId: jti,
      expiredAt,
      deviceInfo: { login_at: new Date().toISOString(), ...(deviceInfo ?? {}) },
    });
    return { access_token: accessToken, expires_in: GUEST_TTL_SECONDS, expired_at: expiredAt, jti };
  }

  // หมุน refresh token: ใช้ได้ครั้งเดียว ได้คู่ใหม่ใน session เดิม (อุปกรณ์/เวลา login เดิม อัปเดต IP ล่าสุด)
  async rotateRefreshToken(refreshToken: string, req: Request) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, { secret: process.env.JWT_REFRESH_SECRET });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const row = await this.userTokenRepo.findOne({ where: { jti: payload.jti, tokenType: 'refresh' }, relations: ['user', 'patient'] });
    if (!row || row.revoked || (row.expired_at && row.expired_at < new Date())) {
      throw new UnauthorizedException('Refresh token revoked/expired');
    }
    if (row.user ? !row.user.isActive : row.patient ? !row.patient.is_active : true) {
      throw new UnauthorizedException('Account inactive');
    }

    await this.userTokenRepo.update({ id: row.id }, { revoked: true, revokedAt: new Date(), revokedReason: 'rotated' });

    const who = row.user ?? row.patient!;
    return this.issueTokenPair(
      {
        id: who.id,
        username: row.user ? row.user.username : row.patient!.phone,
        role: payload.role,
        first_name: who.first_name,
        last_name: who.last_name,
      },
      !!payload.remember,
      { ...(row.deviceInfo ?? {}), ip: getClientIp(req) },
      row.patient ? 'patient' : 'user',
      row.sessionId ?? row.jti,
    );
  }

  // refresh token เก็บใน httpOnly cookie แยก — /auth/refresh ต่ออายุ access token ได้โดยไม่ต้อง login ซ้ำ
  setRefreshCookie(res: Response, tokens: { refreshToken: string; refreshExpiresInSeconds: number }) {
    res.cookie('refresh_token', tokens.refreshToken, Config.token.refreshCookieOptions(tokens.refreshExpiresInSeconds * 1000));
  }

  clearRefreshCookie(res: Response) {
    res.clearCookie('refresh_token', Config.token.refreshCookieOptions());
  }

  // ===== session (อุปกรณ์) =====

  // session_id ของ token (access หรือ refresh) — ตรวจลายเซ็นก่อน กันคนปลอม jti มาสั่ง revoke session คนอื่น
  async sessionIdOfToken(raw: string | undefined, kind: 'access' | 'refresh'): Promise<string | null> {
    if (!raw) return null;
    try {
      const payload: any = this.jwtService.verify(raw, {
        ignoreExpiration: true,
        ...(kind === 'refresh' ? { secret: process.env.JWT_REFRESH_SECRET } : {}),
      });
      const row = await this.userTokenRepo.findOne({ where: { jti: payload.jti }, select: ['id', 'sessionId'] });
      return row?.sessionId ?? null;
    } catch {
      return null;
    }
  }

  // revoke ทุก token ของ session — ownerUserId: จำกัดให้ลบได้เฉพาะ session ของตัวเอง
  async revokeSession(sessionId: string, by: RevokeBy, ownerUserId?: string): Promise<boolean> {
    const qb = this.userTokenRepo
      .createQueryBuilder()
      .update()
      .set({ revoked: true, revokedAt: new Date(), revokedBy: by.revokedBy ?? undefined, revokedReason: by.reason })
      .where('session_id = :sessionId AND revoked = false', { sessionId });
    if (ownerUserId) qb.andWhere('"userId" = :ownerUserId', { ownerUserId });
    return ((await qb.execute()).affected ?? 0) > 0;
  }

  // ออกจากระบบทุกอุปกรณ์ของ user — คืนจำนวนอุปกรณ์ (session) ที่ถูกออก, exceptSessionId = เครื่องที่ใช้อยู่
  async revokeAllTokensOfUser(userId: string, opts: RevokeBy & { exceptSessionId?: string | null }): Promise<number> {
    if (!userId) return 0;
    const scope = (qb: any) => {
      qb.where('"userId" = :userId AND revoked = false', { userId });
      if (opts.exceptSessionId) qb.andWhere('(session_id IS NULL OR session_id <> :sid)', { sid: opts.exceptSessionId });
      return qb;
    };
    const sessions = await scope(this.userTokenRepo.createQueryBuilder().select('DISTINCT session_id', 'sid')).getRawMany();
    await scope(
      this.userTokenRepo
        .createQueryBuilder()
        .update()
        .set({ revoked: true, revokedAt: new Date(), revokedBy: opts.revokedBy ?? undefined, revokedReason: opts.reason }),
    ).execute();
    return sessions.filter((r: { sid: string | null }) => r.sid).length;
  }

  // session ที่ยังใช้งานได้ (มี token ที่ยังไม่ revoke และยังไม่หมดอายุ) — ของ user เดียว หรือทั้งระบบ (หน้า admin)
  async listActiveSessions(filter: { userId?: string; currentSessionId?: string | null }) {
    const qb = this.userTokenRepo
      .createQueryBuilder('t')
      .leftJoin('t.user', 'u')
      .leftJoin('t.patient', 'p')
      .select(['t.id', 't.sessionId', 't.tokenType', 't.created_at', 't.last_used', 't.expired_at', 't.deviceInfo', 't.deviceIp'])
      .addSelect(['u.id', 'u.username', 'u.first_name', 'u.last_name', 'u.role'])
      .addSelect(['p.id', 'p.first_name', 'p.last_name', 'p.phone'])
      .where('t.revoked = false AND t.session_id IS NOT NULL')
      .andWhere('(t.expired_at IS NULL OR t.expired_at > now())')
      .orderBy('t.created_at', 'DESC');
    if (filter.userId) qb.andWhere('u.id = :userId', { userId: filter.userId });
    const rows = await qb.getMany();

    const sessions = new Map<string, ReturnType<AuthService['toSession']>>();
    for (const row of rows) {
      const s = sessions.get(row.sessionId!);
      const lastActive = Math.max(new Date(row.last_used ?? row.created_at).getTime(), s ? s.last_active.getTime() : 0);
      if (!s) sessions.set(row.sessionId!, this.toSession(row, lastActive, filter.currentSessionId));
      else s.last_active = new Date(lastActive);
    }
    const now = Date.now();
    return [...sessions.values()]
      .map((s) => ({ ...s, online: now - s.last_active.getTime() < ONLINE_WINDOW_MS }))
      .sort((a, b) => Number(b.current) - Number(a.current) || b.last_active.getTime() - a.last_active.getTime());
  }

  // แถวล่าสุดของ session → ข้อมูลที่หน้าเว็บแสดง (ไม่ส่ง jti/hash/รหัสผ่าน)
  private toSession(row: UserToken, lastActive: number, currentSessionId?: string | null) {
    const role = row.user ? row.user.role : row.patient ? 'patient' : 'guest';
    const name = row.user
      ? [row.user.first_name, row.user.last_name].filter(Boolean).join(' ') || row.user.username
      : row.patient
        ? `${row.patient.first_name ?? ''} ${row.patient.last_name ?? ''}`.trim()
        : 'ผู้เยี่ยมชม';
    return {
      id: row.sessionId!,
      role,
      name,
      username: row.user?.username ?? row.patient?.phone ?? null,
      device: describeDevice(row.deviceInfo),
      ip: row.deviceIp ?? row.deviceInfo?.ip ?? null,
      login_at: row.deviceInfo?.login_at ?? row.created_at,
      last_active: new Date(lastActive),
      current: !!currentSessionId && row.sessionId === currentSessionId,
    };
  }

  // ===== ประวัติการเข้าสู่ระบบ =====

  async logLogin(actor: Actor | null, success: boolean, req: Request, failReason?: string, attempted?: string) {
    await this.loginLogRepo.save({
      user: actor?.user ?? undefined,
      patient: actor?.patient ?? undefined,
      ip_address: getClientIp(req) ?? undefined,
      user_agent: req.headers['user-agent'],
      success,
      // login ไม่สำเร็จ: เก็บชื่อที่พิมพ์มาด้วย ให้ admin เห็นว่ามีคนพยายามเดารหัสบัญชีไหน
      fail_reason: failReason ? (attempted ? `${failReason} (${attempted.slice(0, 50)})` : failReason) : undefined,
    } as any);
  }

  async recentLogins(limit: number) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new BadRequestException('limit 1–500');
    const rows = await this.loginLogRepo
      .createQueryBuilder('l')
      .leftJoin('l.user', 'u')
      .leftJoin('l.patient', 'p')
      .select(['l.id', 'l.login_time', 'l.ip_address', 'l.user_agent', 'l.success', 'l.fail_reason'])
      .addSelect(['u.username', 'u.role', 'p.phone', 'p.first_name', 'p.last_name'])
      .orderBy('l.login_time', 'DESC')
      .take(limit)
      .getMany();
    return rows.map((l) => ({
      id: l.id,
      at: l.login_time,
      success: l.success,
      reason: l.fail_reason ?? null,
      who: l.user?.username ?? (l.patient ? `${l.patient.first_name} ${l.patient.last_name}`.trim() || l.patient.phone : null),
      role: l.user?.role ?? (l.patient ? 'patient' : null),
      ip: l.ip_address,
      device: describeUserAgent(l.user_agent),
    }));
  }
}
