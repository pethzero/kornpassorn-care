// src/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserToken } from '../../../database/entities/user-token.entity';

// บันทึก last_used อย่างมากนาทีละครั้งต่อ token (ใช้แสดง "ออนไลน์" — ไม่ต้องเขียน DB ทุก request)
const TOUCH_EVERY_MS = 60 * 1000;

// ทุก request ที่มี Bearer token: ลายเซ็นถูก + มีแถวใน user_tokens ที่ยังไม่ถูก revoke/หมดอายุ + บัญชียังเปิดใช้งาน
// (ถูกเตะออก / ออกจากระบบ / ปิดบัญชี → revoke แถว → request ถัดไป 401 ทันที)
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(UserToken) private readonly userTokenRepo: Repository<UserToken>,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET must be defined in environment variables');
    super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), ignoreExpiration: false, secretOrKey: secret });
  }

  async validate(payload: any) {
    const row = payload?.jti
      ? await this.userTokenRepo.findOne({ where: { jti: payload.jti, tokenType: 'access' }, relations: ['user', 'patient'] })
      : null;

    // ไม่มีแถว / ถูก revoke / token รุ่นเก่าที่ไม่มี session_id (หน้าเว็บจะ refresh ได้ token ใหม่ใน session เดิมเอง)
    // เดิมมีข้อยกเว้นให้ admin ผ่านได้ถ้าหาแถวไม่เจอ — ทำให้เตะ admin ออกไม่ได้ (แถวที่ revoke หาไม่เจอ = ผ่าน) จึงเอาออก
    if (!row || row.revoked || !row.sessionId) throw new UnauthorizedException('Session revoked or not found');
    if (row.expired_at && row.expired_at < new Date()) throw new UnauthorizedException('Token expired');
    if (row.user ? !row.user.isActive : row.patient ? !row.patient.is_active : payload.role !== 'guest') {
      throw new UnauthorizedException('Account inactive');
    }

    if (!row.last_used || Date.now() - new Date(row.last_used).getTime() > TOUCH_EVERY_MS) {
      this.userTokenRepo.update({ id: row.id }, { last_used: new Date() }).catch(() => undefined);
    }

    const name = row.user
      ? [row.user.first_name, row.user.last_name].filter(Boolean).join(' ').trim()
      : row.patient
        ? `${row.patient.first_name} ${row.patient.last_name}`.trim()
        : '';
    return {
      userId: row.user?.id ?? row.patient?.id ?? payload.sub,
      username: row.user?.username ?? row.patient?.phone ?? payload.username,
      name: name || payload.name || null,
      role: payload.role,
      jti: row.jti,
      sessionId: row.sessionId,
    };
  }
}
