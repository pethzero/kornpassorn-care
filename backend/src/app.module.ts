// import { Module } from '@nestjs/common';
// import { AppController } from './app.controller';
// import { AppService } from './app.service';

// @Module({
//   imports: [],
//   controllers: [AppController],
//   providers: [AppService],
// })
// export class AppModule {}

// src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';  // นำเข้า controller
import { AppService } from './app.service';        // นำเข้า service
import { AuthModule } from './auth/auth.module';
import { ProfileController } from './profile/profile.controller';
import { SupabaseModule } from './supabase/supabase.module'; // 👈 เพิ่ม

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'dev'}`,
    }),
    AuthModule,
    SupabaseModule,
  ],
  controllers: [ ProfileController],  
  providers: [AppService],       // ลงทะเบียน service
})
export class AppModule {}
