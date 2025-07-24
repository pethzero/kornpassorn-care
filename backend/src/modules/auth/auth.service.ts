// src/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// Update the import path to the correct location of user.entity.ts
import { User } from '../../database/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private databaseService: DatabaseService, // inject service
  ) {}

  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.databaseService.findUserByUsername(username);
    console.log('Validating user:', username);
    console.log('User found:', user);

    if (!user) return null;
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return null;
    return user;
  }

  login(user: any) {
    const payload = { sub: user.id, username: user.username, role: user.role };
    let options = {};
    if (user.role === 'admin') {
      options = {}; // ไม่กำหนด expiresIn = ไม่หมดอายุ
    } else {
      options = { expiresIn: '1d' };
    }
    return {
      access_token: this.jwtService.sign(payload, options),
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
    return {
      access_token: this.jwtService.sign(guestPayload, { expiresIn: '1d' }),
    };
  }
}


