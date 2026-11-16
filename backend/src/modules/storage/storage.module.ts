import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../config/database.module';
import { AuthModule } from '../auth/auth.module';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [StorageController],
  providers: [StorageService],
})
export class StorageModule {}
