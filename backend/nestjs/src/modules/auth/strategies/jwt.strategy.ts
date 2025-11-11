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
      const authHeader = req?.headers?.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException('No valid authorization header');
      }

      const token = authHeader.substring(7);
      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      // lookup by jti first, then by tokenHash (sha256)
      let tokenRecord = null as UserToken | null;
      const jti: string | undefined = payload?.jti;
      if (jti) {
        tokenRecord = await this.userTokenRepo.findOne({ where: { jti, revoked: false }, relations: ['user'] });
      }

      // // ...inside validate(), after tokenRecord validated...
      // if (tokenRecord) {
      //   // update last_used (use repo injected in the strategy)
      //   await this.userTokenRepo.update({ id: tokenRecord.id }, { last_used: new Date() });
      //   // ...rest logic...
      // }

      if (!tokenRecord) {
        const hash = crypto.createHash('sha256').update(token).digest('hex');
        tokenRecord = await this.userTokenRepo.findOne({
          where: [
            { tokenHash: hash, revoked: false }
          ],
          relations: ['user'],
        });
      }

      if (!tokenRecord) {
        throw new UnauthorizedException('Token revoked or not found');
      }

      if (tokenRecord.expired_at && tokenRecord.expired_at < new Date()) {
        throw new UnauthorizedException('Token expired');
      }

      if (!tokenRecord.user?.isActive) {
        throw new UnauthorizedException('User account is inactive');
      }

      return {
        userId: payload.sub,
        username: payload.username,
        role: payload.role,
        tokenId: tokenRecord.id
      };
    } catch (error) {
      console.error('JWT Strategy validation error:', error);
      throw new UnauthorizedException('Token validation failed');
    }
  }
}
