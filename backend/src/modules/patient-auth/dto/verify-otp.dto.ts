import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ example: '0812345678' })
  @IsString()
  @Matches(/^(?:\+66|0)\d{8,9}$/, { message: 'รูปแบบเบอร์โทรไม่ถูกต้อง' })
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'รหัส OTP ต้องเป็นตัวเลข 6 หลัก' })
  otp: string;
}
