import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../../config/database.module';
import { AuthModule } from '../auth/auth.module';
import { ApiClientController } from './api-client.controller';
import { ApiClientGuard } from './api-client.guard';
import { ApiClientService } from './api-client.service';

@Module({
  // JwtModule แยก (ไม่ตั้ง secret กลาง) — ApiClientService ส่ง secret ของ api client เองทุกครั้ง
  imports: [DatabaseModule, AuthModule, JwtModule.register({})],
  controllers: [ApiClientController],
  providers: [ApiClientService, ApiClientGuard],
  exports: [ApiClientService, ApiClientGuard],
})
export class ApiClientModule {}
