import { ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';

import { getClientIp } from '../../utils/device.util';

// เพดาน 'guest' ใช้กับใคร — guard นี้ทำงานก่อน JwtAuthGuard (ยังไม่มี req.user) จึงอ่าน role จาก token เอง
// ไม่ verify ลายเซ็นก็พอ: ปลอม role อื่นเพื่อหนีเพดานนี้ → JwtAuthGuard ตอบ 401 อยู่ดี และยังโดนเพดาน default
export function isAnonymousOrGuest(req: { headers: Record<string, any> }): boolean {
  const auth = String(req.headers?.authorization || '');
  if (!auth.startsWith('Bearer ')) return true;
  try {
    const payload = JSON.parse(Buffer.from(auth.slice(7).split('.')[1], 'base64url').toString());
    return payload?.role === 'guest';
  } catch {
    return true;
  }
}

// จำกัดจำนวน request ต่อ IP จริง (ผ่าน Cloudflare req.ip จะเป็น IP ของ proxy — ทุกคนจะโดนนับรวมกัน)
// ค่าเริ่มต้นทั้งแอปตั้งใน app.module · จุดเสี่ยง (guest login / ส่งแบบสอบถาม) ตั้งเข้มกว่าด้วย @Throttle(...)
// ตัวนับอยู่ใน memory: container รีสตาร์ท/ตื่นจากหลับ = เริ่มนับใหม่ (กฎถาวรต้องอยู่ใน DB)
@Injectable()
export class IpThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return getClientIp(req as any) ?? 'unknown';
  }

  // ปกติ throttler นับแยกทีละ endpoint — เพดาน 'guest' นับรวมทุก endpoint ต่อ IP (F5 หนึ่งครั้งยิงหลาย endpoint)
  protected generateKey(context: ExecutionContext, suffix: string, name: string): string {
    return name === 'guest' ? `guest-${suffix}` : super.generateKey(context, suffix, name);
  }

  protected async throwThrottlingException(_context: ExecutionContext, detail: ThrottlerLimitDetail): Promise<void> {
    const wait = Math.max(1, Math.ceil(detail.timeToBlockExpire || detail.timeToExpire));
    throw new HttpException(
      { statusCode: HttpStatus.TOO_MANY_REQUESTS, message: `ส่งคำขอถี่เกินไป กรุณารอ ${wait} วินาทีแล้วลองใหม่`, retry_after: wait },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
