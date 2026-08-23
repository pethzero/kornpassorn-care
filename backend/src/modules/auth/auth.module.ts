// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TokenCleanupService } from './token-cleanup.service';

// strategies & guards
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

// feature modules / entities
import { UserModule } from '../user/user.module';
import { UserToken } from '../../database/entities/user-token.entity';
import { LoginLog } from '../../database/entities/login-log.entity';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        secret: process.env.JWT_SECRET || 'dev',
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN') || '1d' },
      }),
    }),

    // ensure UserService provider is available
    UserModule,

    // register repositories used by AuthService
    TypeOrmModule.forFeature([UserToken, LoginLog]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    TokenCleanupService,
  ],
  exports: [
    AuthService,
    JwtModule,
    JwtAuthGuard,
  ],
})
export class AuthModule {}
