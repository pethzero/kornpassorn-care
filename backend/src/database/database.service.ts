import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class DatabaseService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // ตัวอย่างเมธอด query พิเศษ
  async findActiveUsers(): Promise<User[]> {
    return this.userRepository.find({ where: { isActive: true } });
  }

  // ตัวอย่าง transaction
  async deactivateUser(id: string): Promise<void> {
    await this.userRepository.update(id, { isActive: false });
  }
}