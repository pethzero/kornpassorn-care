// src/auth/strategies/bearer-token.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserToken } from '../../../database/entities/user-token.entity';

@Injectable()
export class BearerTokenStrategy extends PassportStrategy(Strategy, 'bearer-token') {
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

      // ตรวจสอบ token ในฐานข้อมูล
      const tokenRecord = await this.userTokenRepo.findOne({ 
        where: { token, revoked: false },
        relations: ['user']
      });
      
      if (!tokenRecord) {
        throw new UnauthorizedException('Bearer token is invalid or revoked');
      }

      // ตรวจสอบ token หมดอายุ
      if (tokenRecord.expired_at && tokenRecord.expired_at < new Date()) {
        throw new UnauthorizedException('Bearer token has expired');
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
        authType: 'bearer'
      };
    } catch (error) {
      console.error('Bearer Token Strategy validation error:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Bearer token validation failed');
    }
  }
}
