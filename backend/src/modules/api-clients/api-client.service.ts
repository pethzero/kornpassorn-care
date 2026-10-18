import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { API_SCOPES, ApiClient } from '../../database/entities/api-client.entity';
import { CreateApiClientDto, UpdateApiClientDto } from './dto/api-client.dto';

// อายุ access token ของระบบภายนอก (วินาที) — หมดแล้วให้แลกใหม่ด้วย client_id + secret
export const API_TOKEN_TTL_SECONDS = 3600;
const TOKEN_TYPE = 'api_client';

export interface ApiTokenPayload {
  sub: number;
  client_id: string;
  scope: string;
  typ: typeof TOKEN_TYPE;
}

// ระบบภายนอก (api_clients): สร้าง/จัดการโดย admin, แลก token ด้วย client credentials
// token เซ็นด้วย secret แยกจาก token ของคน → ใช้กับ API ภายใน (/api/documents ฯลฯ) ไม่ได้ และกลับกัน
@Injectable()
export class ApiClientService {
  constructor(
    @InjectRepository(ApiClient) private readonly repo: Repository<ApiClient>,
    private readonly jwt: JwtService,
  ) {}

  private get signingSecret(): string {
    return process.env.API_CLIENT_JWT_SECRET || `${process.env.JWT_SECRET || 'dev'}:api-client`;
  }

  // ----- จัดการ (admin) -----

  listScopes() {
    return Object.entries(API_SCOPES).map(([key, description]) => ({ key, description }));
  }

  async findAll() {
    const rows = await this.repo.find({ order: { create_date: 'DESC' } });
    return rows.map((r) => this.toPublic(r));
  }

  // คืน secret ตัวจริงครั้งเดียว — หลังจากนี้ระบบเก็บแค่ hash
  async create(dto: CreateApiClientDto, currentUser?: string) {
    const secret = this.newSecret();
    const client = await this.repo.save(
      this.repo.create({
        name: dto.name.trim(),
        client_id: `kpc_${randomBytes(8).toString('hex')}`,
        secret_hash: await bcrypt.hash(secret, 10),
        secret_hint: secret.slice(-4),
        scopes: dto.scopes,
        expires_at: parseExpiry(dto.expires_at),
        note: dto.note || null,
        create_by: currentUser || 'system',
      }),
    );
    return { client: this.toPublic(client), client_secret: secret };
  }

  async update(id: number, dto: UpdateApiClientDto) {
    const client = await this.get(id);
    if (dto.name !== undefined) client.name = dto.name.trim();
    if (dto.scopes !== undefined) client.scopes = dto.scopes;
    if (dto.is_active !== undefined) client.is_active = dto.is_active;
    if (dto.expires_at !== undefined) client.expires_at = parseExpiry(dto.expires_at);
    if (dto.note !== undefined) client.note = dto.note || null;
    return this.toPublic(await this.repo.save(client));
  }

  // สร้าง secret ใหม่ (secret เดิมใช้ไม่ได้ทันที — token ที่ออกไปแล้วยังใช้ได้จนหมดอายุ ≤ 1 ชม.)
  async rotateSecret(id: number) {
    const client = await this.get(id);
    const secret = this.newSecret();
    client.secret_hash = await bcrypt.hash(secret, 10);
    client.secret_hint = secret.slice(-4);
    await this.repo.save(client);
    return { client: this.toPublic(client), client_secret: secret };
  }

  async remove(id: number) {
    const client = await this.get(id);
    await this.repo.delete(id);
    return { id, name: client.name };
  }

  // ----- ใช้งาน (ระบบภายนอก) -----

  // client credentials → access token
  async issueToken(clientId: string, clientSecret: string) {
    const client = await this.repo.findOne({ where: { client_id: clientId } });
    // ตอบเหมือนกันทุกกรณี ไม่บอกว่าผิดที่ id หรือ secret
    const ok = client && (await bcrypt.compare(clientSecret, client.secret_hash)) && this.usable(client);
    if (!client || !ok) throw new UnauthorizedException('invalid_client');

    const payload: ApiTokenPayload = { sub: client.id, client_id: client.client_id, scope: client.scopes.join(' '), typ: TOKEN_TYPE };
    const access_token = this.jwt.sign(payload, { secret: this.signingSecret, expiresIn: API_TOKEN_TTL_SECONDS });
    await this.touch(client, true);
    return { access_token, token_type: 'Bearer', expires_in: API_TOKEN_TTL_SECONDS, scope: payload.scope };
  }

  // ตรวจ token ทุก request — โหลด client จาก DB ด้วย เพื่อให้การปิด client มีผลทันที (ไม่ต้องรอ token หมดอายุ)
  async verifyToken(token: string): Promise<ApiClient> {
    let payload: ApiTokenPayload;
    try {
      payload = this.jwt.verify<ApiTokenPayload>(token, { secret: this.signingSecret });
    } catch {
      throw new UnauthorizedException('invalid_token');
    }
    if (payload.typ !== TOKEN_TYPE) throw new UnauthorizedException('invalid_token');
    const client = await this.repo.findOne({ where: { id: payload.sub } });
    if (!client || !this.usable(client)) throw new UnauthorizedException('invalid_token');
    await this.touch(client);
    return client;
  }

  // ----- ภายใน -----

  private usable(client: ApiClient): boolean {
    return client.is_active && (!client.expires_at || client.expires_at.getTime() > Date.now());
  }

  // บันทึกเวลาใช้ล่าสุด — ไม่เกินนาทีละครั้ง ลดการเขียน DB ทุก request
  private async touch(client: ApiClient, force = false) {
    const last = client.last_used_at?.getTime() ?? 0;
    if (force || Date.now() - last > 60_000) {
      await this.repo.update(client.id, { last_used_at: new Date() });
    }
  }

  private newSecret(): string {
    return `kpcs_${randomBytes(24).toString('base64url')}`;
  }

  private async get(id: number) {
    const client = await this.repo.findOne({ where: { id } });
    if (!client) throw new NotFoundException(`ไม่พบ API client ID: ${id}`);
    return client;
  }

  // ไม่ส่ง secret_hash ออกไปไหนทั้งนั้น
  private toPublic(c: ApiClient) {
    const { secret_hash, ...rest } = c;
    return { ...rest, is_expired: !!c.expires_at && c.expires_at.getTime() <= Date.now() };
  }
}

// วันหมดอายุจากช่องเลือกวันที่ ("2026-10-17") = ใช้ได้ "ถึงสิ้นวันนั้น" เวลาไทย
// (เดิม new Date('2026-10-17') = เที่ยงคืน UTC = 07:00 ไทย → เลือกวันนี้แล้วหมดอายุทันทีตั้งแต่ตอนสร้าง)
function parseExpiry(value?: string | null): Date | null {
  if (!value) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T23:59:59.999+07:00`) : new Date(value);
  if (isNaN(date.getTime())) throw new BadRequestException('วันหมดอายุไม่ถูกต้อง');
  if (date.getTime() <= Date.now()) throw new BadRequestException('วันหมดอายุต้องเป็นวันนี้หรือหลังจากนี้');
  return date;
}
