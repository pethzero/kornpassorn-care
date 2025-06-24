// src/app.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller()
export class AppController {
  constructor(private configService: ConfigService) {}

  @Get()
  getAppName(): string {
    return `App Name: ${this.configService.get<string>('APP_NAME')}`;
  }
}
