import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { ProfileController } from './modules/profile/profile.controller';
import { DatabaseModule } from './database/database.module';
import databaseConfig from './config/database.config';
import { DummyModule } from './modules/dummy/dummy.module';
import { PatientModule } from './modules/medical/patient/patient.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'dev'}`,
    }),
    TypeOrmModule.forRoot(databaseConfig()),
    AuthModule,
    DatabaseModule,
    // DummyModule,
    PatientModule,
  ],
  controllers: [AppController, ProfileController],
  providers: [AppService],
})
export class AppModule {}

