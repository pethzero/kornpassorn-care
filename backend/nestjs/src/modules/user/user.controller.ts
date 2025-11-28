import { Controller, Get, Param } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly svc: UserService) {}

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.svc.findById(id);
  }
}