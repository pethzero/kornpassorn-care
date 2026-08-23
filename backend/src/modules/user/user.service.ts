import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  // ไม่ select password_hash — endpoint ที่เรียก findById ส่งค่ากลับให้ client โดยตรง
  findById(id: string): Promise<User | null> {
    return this.repo.findOne({
      where: { id },
      select: ['id', 'username', 'email', 'first_name', 'last_name', 'phone_number', 'isActive', 'createdAt', 'role'],
    });
  }

  findByUsername(username: string): Promise<User | null> {
    return this.repo.findOne({ where: { username } });
  }


  async update(id: string, patch: Partial<User>): Promise<void> {
    await this.repo.update(id, patch as any);
  }

  async listActive(): Promise<User[]> {
    return this.repo.find({ where: { isActive: true } });
  }
}