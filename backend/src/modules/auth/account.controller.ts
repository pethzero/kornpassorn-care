import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtAuthGuard } from './guards';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { User } from '../../database/entities/user.entity';
import { AuthService } from './auth.service';
import {
  ChangePasswordDto,
  CreateStaffUserDto,
  ResetPasswordDto,
  STAFF_ROLES,
  UpdateAccountDto,
  UpdateStaffUserDto,
} from './dto/account.dto';

const PUBLIC_FIELDS: (keyof User)[] = ['id', 'username', 'email', 'first_name', 'last_name', 'phone_number', 'isActive', 'createdAt', 'role'];
const BCRYPT_ROUNDS = () => Number(process.env.BCRYPT_ROUNDS) || 10;

// บัญชีของฉัน — ผู้ใช้ทุกคนที่เป็นเจ้าหน้าที่ (หน้า ตั้งค่า → บัญชีของฉัน)
@Controller('account')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('user', 'admin')
export class AccountController {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly auth: AuthService,
  ) {}

  @Get()
  async me(@Request() req: any) {
    const user = await this.users.findOne({ where: { id: req.user.userId }, select: PUBLIC_FIELDS });
    if (!user) throw new NotFoundException('ไม่พบผู้ใช้');
    return { success: true, data: user };
  }

  @Patch()
  async update(@Request() req: any, @Body() dto: UpdateAccountDto) {
    await this.users.update(req.user.userId, cleanProfile(dto));
    return this.me(req);
  }

  // เปลี่ยนรหัสผ่านตัวเอง — ต้องยืนยันรหัสเดิม และออกจากระบบอุปกรณ์อื่นทั้งหมด (คงไว้แค่อันที่ใช้อยู่)
  @Post('password')
  async changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    const user = await this.users.findOne({ where: { id: req.user.userId } });
    if (!user || !(await bcrypt.compare(dto.current_password, user.password_hash))) {
      throw new BadRequestException('รหัสผ่านเดิมไม่ถูกต้อง');
    }
    if (dto.current_password === dto.new_password) throw new BadRequestException('รหัสผ่านใหม่ต้องไม่ซ้ำรหัสเดิม');
    await this.users.update(user.id, { password_hash: await bcrypt.hash(dto.new_password, BCRYPT_ROUNDS()) });
    // เว้นทั้ง access + refresh ของเครื่องนี้ (เว้นแค่ access → เครื่องนี้หลุดตอน refresh ครั้งถัดไป)
    const currentRefresh = await this.auth.findRefreshJtiOfAccess(user.id, req.user.jti);
    const signedOut = await this.auth.revokeAllTokensOfUser(user.id, {
      revokedBy: user.id,
      reason: 'password changed',
      exceptJtis: [req.user.jti, currentRefresh ?? ''],
    });
    return {
      success: true,
      message: signedOut ? `เปลี่ยนรหัสผ่านแล้ว · ออกจากระบบอุปกรณ์อื่น ${signedOut} เครื่อง` : 'เปลี่ยนรหัสผ่านแล้ว',
    };
  }

  // อุปกรณ์ที่ login อยู่ (1 แถว = 1 การ login) — current = เครื่องที่ใช้อยู่
  @Get('sessions')
  async sessions(@Request() req: any) {
    return { success: true, data: await this.auth.listSessions(req.user.userId, req.user.jti) };
  }

  @Delete('sessions/:id')
  async revokeSession(@Request() req: any, @Param('id') id: string) {
    await this.auth.revokeSession(req.user.userId, id);
    return { success: true, message: 'ออกจากระบบอุปกรณ์นั้นแล้ว' };
  }
}

// จัดการผู้ใช้ (เจ้าหน้าที่) — admin เท่านั้น
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class StaffUsersController {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly auth: AuthService,
  ) {}

  @Get()
  async list() {
    // role api/guest/patient ไม่ใช่เจ้าหน้าที่ — ไม่แสดงในหน้านี้
    const data = await this.users.find({ select: PUBLIC_FIELDS, order: { createdAt: 'ASC' } });
    return { success: true, data: data.filter((u) => (STAFF_ROLES as readonly string[]).includes(u.role)) };
  }

  @Post()
  async create(@Body() dto: CreateStaffUserDto) {
    const username = dto.username.trim().toLowerCase();
    if (await this.users.exist({ where: { username } })) throw new BadRequestException(`ชื่อผู้ใช้ "${username}" มีอยู่แล้ว`);
    const saved = await this.users.save(
      this.users.create({
        ...cleanProfile(dto),
        username,
        role: dto.role,
        isActive: true,
        password_hash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS()),
      }),
    );
    return { success: true, message: `เพิ่มผู้ใช้ ${username} แล้ว`, data: await this.get(saved.id) };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateStaffUserDto, @Request() req: any) {
    const user = await this.get(id);
    // กันล็อกตัวเองออก: ห้ามลดสิทธิ์/ปิดบัญชีตัวเอง และต้องเหลือ admin ที่ใช้งานอยู่อย่างน้อย 1 คน
    const demoting = dto.role !== undefined && dto.role !== 'admin' && user.role === 'admin';
    const disabling = dto.isActive === false && user.isActive;
    if ((demoting || disabling) && id === req.user.userId) throw new ForbiddenException('ลดสิทธิ์หรือปิดบัญชีของตัวเองไม่ได้');
    if ((demoting || disabling) && user.role === 'admin') {
      const admins = await this.users.count({ where: { role: 'admin', isActive: true } });
      if (admins <= 1) throw new BadRequestException('ต้องเหลือผู้ดูแลระบบที่ใช้งานอยู่อย่างน้อย 1 คน');
    }
    await this.users.update(id, {
      ...cleanProfile(dto),
      ...(dto.role !== undefined ? { role: dto.role } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    });
    // ปิดบัญชี → ออกจากระบบทุกอุปกรณ์ทันที
    if (disabling) await this.auth.revokeAllTokensOfUser(id, { revokedBy: req.user.userId, reason: 'account disabled' });
    return { success: true, message: 'อัปเดตผู้ใช้แล้ว', data: await this.get(id) };
  }

  // ตั้งรหัสผ่านใหม่ให้ผู้ใช้ (ลืมรหัส) — ออกจากระบบทุกอุปกรณ์ของผู้ใช้นั้น
  @Post(':id/reset-password')
  async resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto, @Request() req: any) {
    const user = await this.get(id);
    await this.users.update(id, { password_hash: await bcrypt.hash(dto.new_password, BCRYPT_ROUNDS()) });
    await this.auth.revokeAllTokensOfUser(id, { revokedBy: req.user.userId, reason: 'password reset by admin' });
    return { success: true, message: `ตั้งรหัสผ่านใหม่ให้ ${user.username} แล้ว` };
  }

  private async get(id: string) {
    const user = await this.users.findOne({ where: { id }, select: PUBLIC_FIELDS });
    if (!user) throw new NotFoundException('ไม่พบผู้ใช้');
    return user;
  }
}

// รับเฉพาะ field ข้อมูลส่วนตัว — ค่าว่างเก็บเป็น null
function cleanProfile(dto: UpdateAccountDto) {
  const out: Record<string, string | null> = {};
  for (const key of ['first_name', 'last_name', 'email', 'phone_number'] as const) {
    if (dto[key] !== undefined) out[key] = dto[key]?.trim() || null;
  }
  return out;
}
