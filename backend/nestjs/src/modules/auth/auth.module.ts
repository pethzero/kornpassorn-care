// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../database/entities/user.entity'; // ปรับ path ให้ตรงกับที่เก็บ entity
import { DatabaseModule } from '../../database/database.module';
import { UserToken } from '../../database/entities/user-token.entity';
import { LoginLog } from '../../database/entities/login-log.entity';

// Import strategies from new location
import { JwtStrategy } from './strategies/jwt.strategy';
import { BearerTokenStrategy } from './strategies/bearer-token.strategy';
import { CookieJwtStrategy } from './strategies/cookie-jwt.strategy';

// Import guards from new location
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { BearerTokenGuard } from './guards/bearer-token.guard';
import { CookieJwtGuard } from './guards/cookie-jwt.guard';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    TypeOrmModule.forFeature([User, UserToken, LoginLog]), // <-- มี UserToken แล้ว
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN') || '1d' },
      }),
    }),
    DatabaseModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService, 
    // Strategies
    JwtStrategy, 
    BearerTokenStrategy,
    CookieJwtStrategy,
    // Guards
    JwtAuthGuard,
    BearerTokenGuard,
    CookieJwtGuard,
  ],
  exports: [
    JwtModule, 
    JwtAuthGuard, // Original guard
    BearerTokenGuard, // For API endpoints
    CookieJwtGuard, // For web endpoints
  ],
})
export class AuthModule { }
