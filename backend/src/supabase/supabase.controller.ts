// src/supabase/supabase.controller.ts
import { Controller, Get } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

@Controller('supabase')
export class SupabaseController {
  constructor(private readonly supabaseService: SupabaseService) {}

  @Get('users')
  async getUsers() {
    return {
      message: 'Users from Supabase',
    //   data:[],
      data: await this.supabaseService.getUsers(),
    };
  }
}
