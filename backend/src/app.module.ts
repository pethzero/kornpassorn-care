import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm'; // เพิ่ม
import { AppController } from './app.controller';  // นำเข้า controller
import { AppService } from './app.service';        // นำเข้า service
import { AuthModule } from './auth/auth.module';
import { ProfileController } from './profile/profile.controller';
import { SupabaseModule } from './supabase/supabase.module';
import { PostgresqlModule } from './postgresql/postgresql.module'; // เพิ่ม

console.log('PostgreSQL password:', process.env.DB_PASS || '123456'); // แสดงใน console

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'dev'}`,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || '123456',
      database: process.env.DB_NAME || 'your_db_name',
      autoLoadEntities: true,
      synchronize: true,
    }),
    AuthModule,
    SupabaseModule,
    PostgresqlModule,
  ],
  controllers: [ProfileController],
  providers: [AppService],
})
export class AppModule {}

