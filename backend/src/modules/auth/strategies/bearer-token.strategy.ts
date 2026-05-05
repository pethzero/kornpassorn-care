import * as crypto from 'crypto';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserToken } from '../../../database/entities/user-token.entity';

@Injectable()
export class BearerTokenStrategy extends PassportStrategy(Strategy, 'bearer-token') {
  private readonly logger = new Logger(BearerTokenStrategy.name);

  constructor(
    configService: ConfigService,
    @InjectRepository(UserToken)
    private readonly userTokenRepo: Repository<UserToken>
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET must be defined in environment variables');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Bearer token only
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  private hashToken(raw: string) {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  async validate(req: any, payload: any) {
    try {
      // ดึง token จาก Authorization header
      const authHeader = req?.headers?.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException('Authorization header must contain Bearer token');
      }

      const token = authHeader.substring(7); // ตัด "Bearer " ออก
      if (!token) {
        throw new UnauthorizedException('Bearer token is required');
      }

      // พยายามหา Token record จาก DB:
      // 1) lookup by jti (จาก payload)
      // 2) lookup by tokenHash (sha256 of raw token) หรือ raw token (fallback)
      let tokenRecord = null as UserToken | null;
      const jti: string | undefined = payload?.jti;
      if (jti) {
        tokenRecord = await this.userTokenRepo.findOne({ where: { jti, revoked: false }, relations: ['user'] });
      }

      if (!tokenRecord) {
        const hash = this.hashToken(token);
        tokenRecord = await this.userTokenRepo.findOne({
          where: [
            { tokenHash: hash, revoked: false },
          ],
          relations: ['user'],
        });
      }

      // ถ้าเจอ token record ให้ตรวจสอบสถานะ/expiry/user
      if (tokenRecord) {
        // update last_used (use repo injected in the strategy)
        await this.userTokenRepo.update({ id: tokenRecord.id }, { last_used: new Date() });
        // ...rest logic...

        // ถ้าถูก revoked => reject
        if (tokenRecord.revoked) {
          throw new UnauthorizedException('Bearer token is revoked');
        }

        // ถ้ามี flag is_permanent ให้อนุญาต (แต่ยังเช็ค user active)
        const isPermanent = (tokenRecord as any).is_permanent === true;

        // ตรวจสอบ token หมดอายุ (ยกเว้น is_permanent)
        if (!isPermanent && tokenRecord.expired_at && tokenRecord.expired_at < new Date()) {
          throw new UnauthorizedException('Bearer token has expired');
        }

        // ตรวจสอบ user ยัง active หรือไม่
        if (!tokenRecord.user?.isActive) {
          throw new UnauthorizedException('User account is inactive');
        }

        // คืนค่าข้อมูลของ user (payload + info)
        return {
          userId: payload.sub,
          username: payload.username,
          role: payload.role,
          authType: 'bearer',
        };
      }

      // ถ้าไม่พบ tokenRecord
      // - ถ้าเป็น admin และตั้ง ADMIN_NEVER_EXPIRE=true ให้อนุญาต (แต่ log เตือน)
      // - มิฉะนั้น ปฏิเสธ
      const adminNeverExpire = process.env.ADMIN_NEVER_EXPIRE === 'true';
      if (payload?.role === 'admin' && adminNeverExpire) {
        this.logger.warn(`Bearer token not found in DB for admin ${payload?.sub} - allowing due to ADMIN_NEVER_EXPIRE`);
        return {
          userId: payload.sub,
          username: payload.username,
          role: payload.role,
          authType: 'bearer',
        };
      }

      throw new UnauthorizedException('Bearer token is invalid or revoked');
    } catch (error) {
      this.logger.error('Bearer Token Strategy validation error:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Bearer token validation failed');
    }
  }
}