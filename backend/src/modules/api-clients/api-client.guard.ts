import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiScope } from '../../database/entities/api-client.entity';
import { ApiClientService } from './api-client.service';

const SCOPES_KEY = 'api_scopes';

// ระบุ scope ที่ endpoint ต้องการ เช่น @ApiScopes('appointments:read')
export const ApiScopes = (...scopes: ApiScope[]) => SetMetadata(SCOPES_KEY, scopes);

// ใช้กับ /api/v1/* — รับเฉพาะ token ของ api_clients (Authorization: Bearer ...) แล้วเช็ก scope
// token ของคน (login หน้าเว็บ) ใช้ที่นี่ไม่ได้ เพราะเซ็นคนละ secret
@Injectable()
export class ApiClientGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly clients: ApiClientService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const header: string = req.headers['authorization'] || '';
    const [type, token] = header.split(' ');
    if (type?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('ต้องส่ง Authorization: Bearer <access_token>');
    }

    const client = await this.clients.verifyToken(token);
    const required = this.reflector.getAllAndOverride<string[]>(SCOPES_KEY, [context.getHandler(), context.getClass()]) || [];
    const missing = required.filter((s) => !client.scopes.includes(s));
    if (missing.length) {
      throw new ForbiddenException(`client นี้ไม่มีสิทธิ์ ${missing.join(', ')}`);
    }

    req.apiClient = client;
    return true;
  }
}
