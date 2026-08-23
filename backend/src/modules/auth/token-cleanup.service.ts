import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserToken } from '../../database/entities/user-token.entity';
import { Config } from '../../config';

// ลบแถวใน user_tokens ที่ตายแล้ว (revoked หรือหมดอายุ) ทิ้งเป็นระยะ กัน table โตไม่มีที่สิ้นสุด
// (login/refresh สร้าง 2 แถวใหม่ทุกครั้ง แต่ไม่เคยมีอะไรลบทิ้งเลยก่อนหน้านี้)
// เก็บไว้ TOKEN_CLEANUP_RETENTION_DAYS วันก่อนลบจริง เผื่อต้อง audit ย้อนหลัง และไม่แตะ token ที่ยัง valid/permanent อยู่
@Injectable()
export class TokenCleanupService {
  private readonly logger = new Logger(TokenCleanupService.name);

  constructor(
    @InjectRepository(UserToken) private readonly userTokenRepo: Repository<UserToken>,
  ) { }

  @Cron(Config.token.TOKEN_CLEANUP_CRON)
  async handleCron() {
    if (!Config.token.TOKEN_CLEANUP_ENABLED) return;

    try {
      const deleted = await this.cleanup();
      if (deleted > 0) {
        this.logger.log(`Cleaned up ${deleted} old user_tokens row(s)`);
      }
    } catch (err) {
      this.logger.error('Token cleanup failed:', err);
    }
  }

  async cleanup(): Promise<number> {
    const cutoff = new Date(Date.now() - Config.token.TOKEN_CLEANUP_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    const result = await this.userTokenRepo
      .createQueryBuilder()
      .delete()
      .where(
        `(revoked = true AND COALESCE(revoked_at, created_at) < :cutoff)
         OR (is_permanent = false AND expired_at IS NOT NULL AND expired_at < :cutoff)`,
        { cutoff },
      )
      .execute();

    return result.affected ?? 0;
  }
}
