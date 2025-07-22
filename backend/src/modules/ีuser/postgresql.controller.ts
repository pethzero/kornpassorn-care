import { Controller, Get, Post, Body } from '@nestjs/common';
import { PostgresqlService } from './postgresql.service';
import { User } from '../../database/entities/user.entity';

@Controller('users')
export class PostgresqlController {
  constructor(private readonly postgresqlService: PostgresqlService) {}

  @Get()
  findAll() {
    return this.postgresqlService.findAll();
  }

  @Post()
  create(@Body() data: Partial<User>) {
    return this.postgresqlService.create(data);
  }
}