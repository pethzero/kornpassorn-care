import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserToken } from '../../database/entities/user-token.entity';
import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('profile')
export class ProfileController {
  @UseGuards(JwtAuthGuard)
  @Get()
  getProfile(@Request() req) {
    return {
      message: 'Profile data',
      user: req.user, // มาจาก JWT token ที่ decode แล้ว
    };
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([UserToken])],
  controllers: [ProfileController],
})
export class ProfileModule {}
