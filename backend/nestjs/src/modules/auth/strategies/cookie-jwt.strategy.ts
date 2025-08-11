// src/auth/strategies/cookie-jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserToken } from '../../../database/entities/user-token.entity';
import { Request } from 'express';

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
      // ดึง token จาก cookie หรือ Authorization header
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

      // ตรวจสอบ token ในฐานข้อมูล
      const tokenRecord = await this.userTokenRepo.findOne({ 
        where: { token, revoked: false },
        relations: ['user']
      });
      
      if (!tokenRecord) {
        throw new UnauthorizedException('JWT token is invalid or revoked');
      }

      // ตรวจสอบ token หมดอายุ
      if (tokenRecord.expired_at && tokenRecord.expired_at < new Date()) {
        throw new UnauthorizedException('JWT token has expired');
      }

      // ตรวจสอบ user ยัง active หรือไม่
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
