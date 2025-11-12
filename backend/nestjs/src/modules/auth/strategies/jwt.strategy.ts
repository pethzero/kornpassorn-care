// src/auth/strategies/jwt.strategy.ts
import * as crypto from 'crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserToken } from '../../../database/entities/user-token.entity';
// ...existing code...

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
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
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true, // เพิ่มบรรทัดนี้เพื่อส่ง request object ไปยัง validate method
    });
  }

  async validate(req: any, payload: any) {
    try {
      const authHeader = req?.headers?.authorization as string | undefined;
      const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

      // lookup by jti then tokenHash
      let tokenRecord = null as any;
      const jti: string | undefined = payload?.jti;
      if (jti) {
        tokenRecord = await this.userTokenRepo.findOne({ where: { jti, revoked: false }, relations: ['user'] });
      }

      if (!tokenRecord && token) {
        const hash = crypto.createHash('sha256').update(token).digest('hex');
        tokenRecord = await this.userTokenRepo.findOne({ where: { tokenHash: hash, revoked: false }, relations: ['user'] });
      }

      if (!tokenRecord) {
        throw new UnauthorizedException('Token revoked or not found');
      }

      // expired check (unless permanent)
      if (tokenRecord.expired_at && tokenRecord.expired_at < new Date() && !tokenRecord.is_permanent) {
        throw new UnauthorizedException('Token expired');
      }

      // If there is a linked user, ensure active. If no user -> allow only guest tokens.
      if (tokenRecord.user) {
        if (!tokenRecord.user.isActive) {
          throw new UnauthorizedException('User account is inactive');
        }
      } else {
        // allow guest tokens without user relation
        if (payload?.role !== 'guest') {
          throw new UnauthorizedException('User not found for token');
        }
      }

      // update last_used (best-effort)
      try {
        await this.userTokenRepo.update({ id: tokenRecord.id }, { last_used: new Date() });
      } catch (e) { /* ignore update errors */ }

      // return normalized user info (works for guest and normal users)
      return {
        userId: tokenRecord.user?.id ?? payload.sub,
        username: tokenRecord.user?.username ?? payload.username,
        name: tokenRecord.user?.name ?? payload.name ?? null,
        role: payload.role,
        tokenId: tokenRecord.id,
        jti: tokenRecord.jti ?? payload.jti,
      };
    } catch (error) {
      console.error('JWT Strategy validation error:', error);
      throw new UnauthorizedException('Token validation failed');
    }
  }
}
