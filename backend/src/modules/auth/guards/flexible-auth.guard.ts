import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Observable, firstValueFrom } from 'rxjs';
import { BearerTokenGuard } from './bearer-token.guard';
import { JwtAuthGuard } from './jwt-auth.guard';

@Injectable()
export class FlexibleAuthGuard implements CanActivate {
  constructor(
    private bearerTokenGuard: BearerTokenGuard,
    private jwtAuthGuard: JwtAuthGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // ตรวจสอบว่ามี Authorization header หรือไม่
    const authHeader = request.headers.authorization;
    console.log(authHeader)
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // ถ้ามี Bearer token ใช้ BearerTokenGuard
      try {
        const result = this.bearerTokenGuard.canActivate(context);
        return result instanceof Observable ? await firstValueFrom(result) : result;
      } catch (error) {
        console.log('Bearer token authentication failed:', error.message);
        // ถ้า Bearer token ไม่สำเร็จ ลองใช้ Cookie
      }
    }
    
    // ถ้าไม่มี Bearer token หรือ Bearer token ไม่สำเร็จ ลองใช้ Cookie JWT
    try {
      const result = this.jwtAuthGuard.canActivate(context);
      return result instanceof Observable ? await firstValueFrom(result) : result;
    } catch (error) {
      console.log('Cookie JWT authentication failed:', error.message);
      throw new UnauthorizedException('Authentication required. Please provide either Bearer token or valid session cookie.');
    }
  }
}
