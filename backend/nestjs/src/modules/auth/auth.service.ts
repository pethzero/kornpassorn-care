// src/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// Update the import path to the correct location of user.entity.ts
import { User } from '../../database/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../../database/database.service';
import { UserToken } from '../../database/entities/user-token.entity';
import { LoginLog } from '../../database/entities/login-log.entity';


@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private databaseService: DatabaseService, // inject service
    @InjectRepository(UserToken) private userTokenRepo: Repository<UserToken>,
    @InjectRepository(LoginLog) private loginLogRepo: Repository<LoginLog>,
  ) { }

  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.databaseService.findUserByUsername(username);
    console.log('Validating user:', username);
    console.log('Validating password:', password);
    console.log('User found:', user);

    if (!user) return null;
    const isMatch = await bcrypt.compare(password, user.password_hash);
    console.log('Password match:', isMatch);
    if (!isMatch) return null;
    return user;
  }

  // login(user: any) {
  //   const payload = { sub: user.id, username: user.username, role: user.role };
  //   let options = {};
  //   if (user.role === 'admin') {
  //     options = {}; // ไม่กำหนด expiresIn = ไม่หมดอายุ
  //   } else {
  //     // options = { expiresIn: '1d' };
  //     options = { expiresIn: '10s' };
  //   }
  //   return {
  //     access_token: this.jwtService.sign(payload, options),
  //   };
  // }

  generateJwt(payload: any, expiresIn?: string): string {
    if (expiresIn) {
      return this.jwtService.sign(payload, { expiresIn });
    }
    return this.jwtService.sign(payload);
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


  // บันทึก log ทุกครั้งที่ login (สำเร็จ/ล้มเหลว)
  async logLogin(user: User | null, success: boolean, req: any, failReason?: string) {
    await this.loginLogRepo.save({
      user: user || undefined, // ใช้ undefined แทน null
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      success,
      fail_reason: failReason || undefined,
    });
  }

  // หลัง login สำเร็จ
  async saveToken(user: User, token: string, expiredAt: Date) {
    await this.userTokenRepo.save({
      user,
      token,
      expired_at: expiredAt,
      revoked: false,
    });
  }

  // logout
  async revokeToken(token: string) {
    await this.userTokenRepo.update({ token }, { revoked: true });
  }

  async revokeAllTokensOfUser(userId: string) {
    await this.userTokenRepo.update({ user: { id: userId } }, { revoked: true });
  }

  // ✅ API สำหรับขอ token ด้วย username/password (สำหรับ API users)
  async getTokenByCredentials(username: string, password: string, req: any) {
    try {
      // ตรวจสอบ username และ password ว่าถูกส่งมาหรือไม่
      if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
        await this.logApiKeyUsage(null, false, req, 'Username or password is missing or invalid type');
        return {
          success: false,
          message: 'Username และ Password จำเป็นต้องระบุ'
        };
      }

      // หา API user ในฐานข้อมูล
      const apiUser = await this.databaseService.findUserByUsername(username);
      
      if (!apiUser || apiUser.role !== 'api') {
        await this.logApiKeyUsage(null, false, req, 'API user not found or invalid role');
        return {
          success: false,
          message: 'API user ไม่ถูกต้องหรือไม่มีสิทธิ์'
        };
      }

      if (!apiUser.isActive) {
        await this.logApiKeyUsage(apiUser, false, req, 'API user is inactive');
        return {
          success: false,
          message: 'API user ถูกปิดการใช้งาน'
        };
      }

      // ตรวจสอบ password
      const isPasswordValid = await bcrypt.compare(password, apiUser.password_hash);
      if (!isPasswordValid) {
        await this.logApiKeyUsage(apiUser, false, req, 'Invalid password');
        return {
          success: false,
          message: 'Password ไม่ถูกต้อง'
        };
      }

      // สร้าง JWT token
      const payload = {
        sub: apiUser.id,
        username: apiUser.username,
        role: apiUser.role,
        api_token: true, // ระบุว่าเป็น token จาก API credentials
      };

      const expiresIn = '10s'; // API token อายุ 24 ชั่วโมง
      const token = this.jwtService.sign(payload, { expiresIn });

      // แปลง expiresIn เป็นวินาที (รองรับ h, d, m)
      function parseExpiresIn(str: string): number {
        const match = str.match(/^(\d+)([dhms])$/);
        if (!match) return 0;
        const value = parseInt(match[1], 10);
        switch (match[2]) {
          case 'd': return value * 24 * 60 * 60;
          case 'h': return value * 60 * 60;
          case 'm': return value * 60;
          case 's': return value;
          default: return 0;
        }
      }

      const expiresInSeconds = parseExpiresIn(expiresIn);

      // บันทึก token
      const expiredAt = new Date(Date.now() + expiresInSeconds * 1000);
      await this.saveToken(apiUser, token, expiredAt);

      // บันทึก log สำเร็จ
      await this.logApiKeyUsage(apiUser, true, req);

      return {
        success: true,
        access_token: token,
        expires_in: expiresInSeconds,
        user_role: apiUser.role
      };

    } catch (error) {
      console.error('Error in getTokenByCredentials:', error);
      await this.logApiKeyUsage(null, false, req, `System error: ${error.message}`);
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดภายในระบบ'
      };
    }
  }

  // ✅ API สำหรับขอ token ด้วย API key (เก่า - เก็บไว้เผื่อใช้)
  async getTokenByApiKey(apiKey: string, req: any) {
    try {
      // ตรวจสอบ API key ว่าถูกส่งมาหรือไม่
      if (!apiKey || typeof apiKey !== 'string') {
        await this.logApiKeyUsage(null, false, req, 'API key is missing or invalid type');
        return {
          success: false,
          message: 'API key จำเป็นต้องระบุ'
        };
      }

      // ตรวจสอบ API key format
      if (!apiKey.startsWith('api_')) {
        await this.logApiKeyUsage(null, false, req, 'Invalid API key format');
        return {
          success: false,
          message: 'รูปแบบ API key ไม่ถูกต้อง (ต้องขึ้นต้นด้วย api_)'
        };
      }

      // หา API user ในฐานข้อมูล
      const apiUser = await this.databaseService.findUserByUsername(apiKey);
      
      if (!apiUser || apiUser.role !== 'api') {
        await this.logApiKeyUsage(null, false, req, 'API key not found or invalid role');
        return {
          success: false,
          message: 'API key ไม่ถูกต้องหรือไม่มีสิทธิ์'
        };
      }

      if (!apiUser.isActive) {
        await this.logApiKeyUsage(apiUser, false, req, 'API key is inactive');
        return {
          success: false,
          message: 'API key ถูกปิดการใช้งาน'
        };
      }

      // สร้าง JWT token
      const payload = {
        sub: apiUser.id,
        username: apiUser.username,
        role: apiUser.role,
        api_key: true, // ระบุว่าเป็น token จาก API key
      };

      const expiresIn = '10s'; // API token อายุ 24 ชั่วโมง
      const token = this.jwtService.sign(payload, { expiresIn });

      // แปลง expiresIn เป็นวินาที (รองรับ h, d, m)
      function parseExpiresIn(str: string): number {
        const match = str.match(/^(\d+)([dhms])$/);
        if (!match) return 0;
        const value = parseInt(match[1], 10);
        switch (match[2]) {
          case 'd': return value * 24 * 60 * 60;
          case 'h': return value * 60 * 60;
          case 'm': return value * 60;
          case 's': return value;
          default: return 0;
        }
      }

      const expiresInSeconds = parseExpiresIn(expiresIn);

      // บันทึก token
      const expiredAt = new Date(Date.now() + expiresInSeconds * 1000);
      await this.saveToken(apiUser, token, expiredAt);

      // บันทึก log สำเร็จ
      await this.logApiKeyUsage(apiUser, true, req);

      return {
        success: true,
        access_token: token,
        expires_in: expiresInSeconds,
        user_role: apiUser.role
      };

    } catch (error) {
      console.error('Error in getTokenByApiKey:', error);
      await this.logApiKeyUsage(null, false, req, `System error: ${error.message}`);
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดภายในระบบ'
      };
    }
  }

  // บันทึก log การใช้ API key
  async logApiKeyUsage(user: User | null, success: boolean, req: any, failReason?: string) {
    await this.loginLogRepo.save({
      user: user || undefined,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      success,
      fail_reason: failReason || undefined,
    });
  }
}


