// src/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SupabaseService } from '../supabase/supabase.service';

export type User = {
  id: number;
  username: string;
  password: string;
  role: string;
};

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private supabase: SupabaseService
  ) { }

  async validateUser(username: string, password: string) {
    console.log(username)
    console.log(password)
    const { data, error } = await this.supabase
      .getClient()
      .from('user_center')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .maybeSingle(); // ใช้ maybeSingle เพื่อไม่ให้ error ถ้าไม่เจอ

    console.log('AA',data)
    if (error || !data) return null;
    return data;
  }

  login(user: any) {
    const payload = { sub: user.id, username: user.username, role: user.role };
    return {
      // access_token: this.jwtService.sign(payload, { expiresIn: '10s' }),
      access_token: this.jwtService.sign(payload, { expiresIn: '30m' }), // ผู้ใช้จริง
    };
  }

  generateJwt(payload: any, expiresIn: string = '30m'): string {
    return this.jwtService.sign(payload, { expiresIn });
  }

  // ✅ Guest Login แบบไม่เช็ค DB
  loginAsGuest() {
    const guestPayload = {
      sub: 'guest-id',
      username: 'guest',
      role: 'guest',
    };
    console.log(guestPayload)
    const token = this.jwtService.sign(guestPayload);
    return {
      // access_token: token 
      access_token: this.jwtService.sign(guestPayload, { expiresIn: '5m' }), // สั้นลง
    };
  }
}



// private readonly users: User[] = [
//   { id: 1, username: 'admin', password: 'admin123', role: 'admin' },
//   { id: 2, username: 'user', password: 'user123', role: 'user' },
// ];

// constructor(private jwtService: JwtService) {}

// async validateUser(username: string, password: string): Promise<Omit<User, 'password'> | null> {
//   const user = this.users.find(u => u.username === username && u.password === password);
//   if (!user) return null;

//   const { password: _, ...result } = user;
//   return result;
// }

// async login(user: Omit<User, 'password'>) {
//   const payload = { username: user.username, sub: user.id, role: user.role };
//   return {
//     access_token: this.jwtService.sign(payload),
//   };
// }