import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { AppDataSource } from './data-source';

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

  async findUserByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  // ตัวอย่างการใช้ AppDataSource() สำหรับ default database (ใช้ databaseConfig)
  async findActiveUsersFromDefault(): Promise<User[]> {
    const defaultDataSource = AppDataSource(); // ไม่ระบุ parameter = default database (databaseConfig)
    if (!defaultDataSource.isInitialized) {
      await defaultDataSource.initialize();
    }
    
    const userRepo = defaultDataSource.getRepository(User);
    return userRepo.find({ where: { isActive: true } });
  }

  // ตัวอย่างการใช้ AppDataSource('db1') สำหรับ specific database (ใช้ createDataSourceConfig)
  async findActiveUsersFromDb1(): Promise<User[]> {
    const db1DataSource = AppDataSource('db1'); // ระบุ 'db1' = ใช้ createDataSourceConfig
    if (!db1DataSource.isInitialized) {
      await db1DataSource.initialize();
    }
    
    const userRepo = db1DataSource.getRepository(User);
    return userRepo.find({ where: { isActive: true } });
  }

  // ตัวอย่างการใช้ AppDataSource('db2') สำหรับ medical database
  async findPatientsFromDb2(): Promise<any[]> {
    const db2DataSource = AppDataSource('db2'); // Medical database
    if (!db2DataSource.isInitialized) {
      await db2DataSource.initialize();
    }
    
    // สมมติว่ามี Patient entity ใน db2
    try {
      const patientRepo = db2DataSource.getRepository('Patient');
      return patientRepo.find();
    } catch (error) {
      console.log('Patient entity not available in db2');
      return [];
    }
  }

  // Debug helper - แสดงรายการ entities ในแต่ละ database
  async getAvailableEntitiesInfo() {
    const { listEntitiesInDatabase } = await import('./entity-registry');
    
    return {
      default: listEntitiesInDatabase('default'),
      db1: listEntitiesInDatabase('db1'),
      db2: listEntitiesInDatabase('db2'),
      finance_db: listEntitiesInDatabase('finance_db'),
    };
  }
}