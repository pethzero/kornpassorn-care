import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './config/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { PatientModule } from './modules/medical/patient/patient.module';
import { FinanceModule } from './modules/finance/finance.module';
import { ProtectedModule } from './modules/protected/protected.module';
import { DummyModule } from './modules/dummy/dummy.module';
import { ProfileController } from './modules/profile/profile.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'dev'}`,
    }),

    // DatabaseModule already registers TypeOrm default connection
    DatabaseModule,

    // feature modules that use repositories (keep after DatabaseModule)
    AuthModule,
    PatientModule,
    FinanceModule,
    ProtectedModule,
    DummyModule,
  ],
  controllers: [AppController, ProfileController],
  providers: [AppService],
})
export class AppModule {}

