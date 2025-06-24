// src/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export type User = {
  id: number;
  username: string;
  password: string;
  role: string;
};

@Injectable()
export class AuthService {
  private readonly users: User[] = [
    { id: 1, username: 'admin', password: 'admin123', role: 'admin' },
    { id: 2, username: 'user', password: 'user123', role: 'user' },
  ];

  constructor(private jwtService: JwtService) {}

  async validateUser(username: string, password: string): Promise<Omit<User, 'password'> | null> {
    const user = this.users.find(u => u.username === username && u.password === password);
    if (!user) return null;

    const { password: _, ...result } = user;
    return result;
  }

  async login(user: Omit<User, 'password'>) {
    const payload = { username: user.username, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
