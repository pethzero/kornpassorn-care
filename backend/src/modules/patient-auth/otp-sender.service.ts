import { Injectable, Logger } from '@nestjs/common';

// ยังไม่มี SMS gateway จริงในโปรเจกต์นี้ (เช็คแล้ว ไม่มี Twilio/nodemailer/ผู้ให้บริการ SMS ไทยติดตั้งอยู่)
// ตอนนี้ log OTP ไว้ดูใน console/log เท่านั้น ส่วน devOtp ที่ส่งกลับใน response (เฉพาะ non-production)
// ทำให้ flow ทดสอบได้ครบวงจรตั้งแต่วันนี้ — พอมี SMS gateway จริงค่อยเปลี่ยน implementation ในไฟล์นี้ไฟล์เดียว
@Injectable()
export class OtpSenderService {
  private readonly logger = new Logger(OtpSenderService.name);

  async send(phone: string, otp: string): Promise<void> {
    this.logger.log(`[DEV OTP] ${phone} -> ${otp}`);
  }
}
