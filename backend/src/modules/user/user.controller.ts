import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly svc: UserService) {}

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.svc.findById(id);
  }
}