// src/auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserToken } from '../../database/entities/user-token.entity';

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
    });
  }

  async validate(payload: any) {
    // ดึง token จาก request
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(this['request']);
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }
    // ตรวจสอบ revoked
    const tokenRecord = await this.userTokenRepo.findOne({ where: { token, revoked: false } });
    if (!tokenRecord) {
      throw new UnauthorizedException('Token revoked or not found');
    }
    return { userId: payload.sub, username: payload.username, role: payload.role };
  }
}
