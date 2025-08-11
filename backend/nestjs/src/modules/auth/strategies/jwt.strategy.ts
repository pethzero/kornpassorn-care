// src/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserToken } from '../../../database/entities/user-token.entity';

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
      // ดึง token จาก Authorization header
      const authHeader = req?.headers?.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException('No valid authorization header');
      }
      
      const token = authHeader.substring(7); // ตัด "Bearer " ออก
      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      // ตรวจสอบ revoked (อาจใช้ cache ในอนาคต)
      const tokenRecord = await this.userTokenRepo.findOne({ 
        where: { token, revoked: false },
        relations: ['user']
      });
      
      if (!tokenRecord) {
        throw new UnauthorizedException('Token revoked or not found');
      }

      // ตรวจสอบ token หมดอายุ
      if (tokenRecord.expired_at && tokenRecord.expired_at < new Date()) {
        throw new UnauthorizedException('Token expired');
      }

      // ตรวจสอบ user ยัง active หรือไม่
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
