// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from '../../database/database.module';

// Import strategies from new location
import { JwtStrategy } from './strategies/jwt.strategy';
import { BearerTokenStrategy } from './strategies/bearer-token.strategy';
import { CookieJwtStrategy } from './strategies/cookie-jwt.strategy';

// Import guards from new location
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { BearerTokenGuard } from './guards/bearer-token.guard';
import { CookieJwtGuard } from './guards/cookie-jwt.guard';
import { FlexibleAuthGuard } from './guards/flexible-auth.guard';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN') || '1d' },
      }),
    }),
    DatabaseModule, // This provides all the entities via TypeOrmModule
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
    FlexibleAuthGuard,
  ],
  exports: [
    JwtModule, 
    JwtAuthGuard, // Original guard
    BearerTokenGuard, // For API endpoints
    CookieJwtGuard, // For web endpoints
    FlexibleAuthGuard, // For flexible authentication
    AuthService, // Export AuthService
  ],
})
export class AuthModule { }
