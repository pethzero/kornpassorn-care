import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './config/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { PatientAuthModule } from './modules/patient-auth/patient-auth.module';
import { PatientModule } from './modules/medical/patient/patient.module';
import { QuestionnaireModule } from './modules/medical/questionnaire/questionnaire.module';
import { HospitalScheduleModule } from './modules/hospital-schedule/hospital-schedule.module';
import { FinanceModule } from './modules/finance/finance.module';
import { DocumentModule } from './modules/documents/document.module';
import { AppointmentModule } from './modules/appointments/appointment.module';
import { ApiClientModule } from './modules/api-clients/api-client.module';
import { PublicApiModule } from './modules/public-api/public-api.module';
import { SettingsModule } from './modules/settings/settings.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ProtectedModule } from './modules/protected/protected.module';
import { DummyModule } from './modules/dummy/dummy.module';
import { ProfileController } from './modules/profile/profile.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'dev'}`,
    }),

    // เปิดใช้ @Cron(...) ทั่วแอป — ต้อง forRoot() แค่จุดเดียวที่ root module (auth module ใช้สำหรับ TokenCleanupService)
    ScheduleModule.forRoot(),

    // DatabaseModule already registers TypeOrm default connection
    DatabaseModule,

    // serve Angular production build (webui/dist/webui/browser) สำหรับ route ที่ไม่ใช่ /api
    // ให้ frontend กับ backend อยู่ origin เดียวกัน (port เดียว) ใช้ได้กับ Cloudflare Tunnel
    // ที่ชี้ทั้ง domain มาที่ localhost:3000 จุดเดียว
    ServeStaticModule.forRoot({
      // production เสิร์ฟ build ของตัวเอง (dist/webui-prod) — ไม่โดน ng build ตอนพัฒนา (dist/webui) เขียนทับ
      rootPath: join(
        __dirname, '..', '..', 'webui', 'dist',
        process.env.NODE_ENV === 'production' ? 'webui-prod' : 'webui',
        'browser',
      ),
      exclude: ['/api/{*splat}'],
    }),

    // feature modules that use repositories (keep after DatabaseModule)
    AuthModule,
    PatientAuthModule,
    PatientModule,
    QuestionnaireModule,
    HospitalScheduleModule,
    FinanceModule,
    InventoryModule,
    DocumentModule,
    AppointmentModule,
    ApiClientModule, // admin จัดการระบบภายนอก (/api/api-clients)
    PublicApiModule, // API สำหรับระบบภายนอก (/api/v1/*)
    SettingsModule, // ข้อมูลคลินิก + รายการบริการ (/api/settings/clinic)
    ProtectedModule,
    DummyModule,
  ],
  controllers: [AppController, ProfileController],
  providers: [AppService],
})
export class AppModule {}

