// src/auth/strategies/cookie-jwt.strategy.ts
import * as crypto from 'crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserToken } from '../../../database/entities/user-token.entity';
import { Request } from 'express';
// ...existing code...

@Injectable()
export class CookieJwtStrategy extends PassportStrategy(Strategy, 'cookie-jwt') {
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
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req.cookies?.['token'], // จาก cookie
        ExtractJwt.fromAuthHeaderAsBearerToken(), // fallback Bearer token
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    try {
      let token = req?.cookies?.['token'];
      let authType = 'cookie';
      
      if (!token) {
        const authHeader = req?.headers?.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
          authType = 'bearer';
        }
      }

      if (!token) {
        throw new UnauthorizedException('JWT token is required (cookie or Bearer)');
      }

      // lookup by jti then tokenHash
      let tokenRecord = null as UserToken | null;
      const jti: string | undefined = payload?.jti;
      if (jti) {
        tokenRecord = await this.userTokenRepo.findOne({ where: { jti, revoked: false }, relations: ['user'] });
      }

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
        throw new UnauthorizedException('JWT token is invalid or revoked');
      }

      if (tokenRecord.expired_at && tokenRecord.expired_at < new Date()) {
        throw new UnauthorizedException('JWT token has expired');
      }

      if (!tokenRecord.user?.isActive) {
        throw new UnauthorizedException('User account is inactive');
      }

      return { 
        userId: payload.sub, 
        username: payload.username, 
        role: payload.role,
        tokenId: tokenRecord.id,
        authType: authType
      };
    } catch (error) {
      console.error('Cookie JWT Strategy validation error:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('JWT token validation failed');
    }
  }
}
