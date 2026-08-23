import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { DatabaseModule } from '../../config/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    DatabaseModule, // Provides entities if needed
    AuthModule, // Provides authentication guards
  ],
  controllers: [ProfileController],
})
export class ProfileModule {}
