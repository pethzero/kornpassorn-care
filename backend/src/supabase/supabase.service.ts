// src/supabase/supabase.service.ts
import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!
    );
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  async getUsers() {
    // const { data, error } = await this.supabase.from('user_center').select('*');
    const { data, error } = await this.supabase.from("user_center").select();
    if (error) throw error;
    return data;
  }
  // async findUserByUsername(username: string) {
  //   const { data, error } = await this.supabase
  //     .from('users')
  //     .select('*')
  //     .eq('username', username)
  //     .single();

  //   if (error) return null;
  //   return data;
  // }
}
