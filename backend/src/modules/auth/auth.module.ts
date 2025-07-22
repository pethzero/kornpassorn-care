// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
// import { SupabaseModule } from '../../../supabase/supabase.module';
// import { User } from '../postgresql/entities/user.entity';
// import { TypeOrmModule } from '@nestjs/typeorm';


@Module({
  imports: [
    ConfigModule,
    PassportModule,
    // SupabaseModule,
    // TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN') || '1d' },
      }),
    }),
  ],
  controllers: [AuthController], // ✅ ต้องมีตรงนี้
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
