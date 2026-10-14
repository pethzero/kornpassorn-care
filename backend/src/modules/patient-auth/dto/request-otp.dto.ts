import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class RequestOtpDto {
  @ApiProperty({ example: '0812345678' })
  @IsString()
  @Matches(/^(?:\+66|0)\d{8,9}$/, { message: 'รูปแบบเบอร์โทรไม่ถูกต้อง' })
  phone: string;
}
