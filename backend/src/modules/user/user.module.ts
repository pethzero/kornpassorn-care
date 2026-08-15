import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../database/entities/user.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { DatabaseModule } from '../../config/database.module';

@Module({
  imports: [
    DatabaseModule,                // ensures DB connection registered
  ],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService], // export so other modules (Auth) can inject UserService
})
export class UserModule {}