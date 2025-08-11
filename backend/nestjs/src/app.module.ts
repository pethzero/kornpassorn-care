import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { ProfileController } from './modules/profile/profile.controller';
import { DatabaseModule } from './database/database.module';
import { DummyModule } from './modules/dummy/dummy.module';
import { PatientModule } from './modules/medical/patient/patient.module';
import { FinanceModule } from './modules/finance/finance.module';
import { ProtectedModule } from './modules/protected/protected.module';
import { databaseConfig } from './database/data-source';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'dev'}`,
    }),
    TypeOrmModule.forRoot(databaseConfig()), // เพิ่ม forRoot สำหรับ default database
    AuthModule,
    DatabaseModule,
    PatientModule,
    FinanceModule,
    ProtectedModule,
  ],
  controllers: [AppController, ProfileController],
  providers: [AppService],
})
export class AppModule { }

