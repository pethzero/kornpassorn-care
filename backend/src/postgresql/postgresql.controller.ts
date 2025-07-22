import { Controller, Get } from '@nestjs/common';
import { PostgresqlService } from './postgresql.service';

@Controller('users')
export class PostgresqlController {
  constructor(private readonly postgresqlService: PostgresqlService) {}

  @Get()
  findAll() {
    return this.postgresqlService.findAll();
  }
}