// src/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// Update the import path to the correct location of user.entity.ts
import { User } from '../../database/entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async validateUser(username: string, password: string) {
    const user = await this.userRepository.findOne({
      where: { username },
    });
    if (!user) return null;
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return null;
    return user;
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


