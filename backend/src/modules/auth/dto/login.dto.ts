import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin' })
  @IsString()
  username: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: false, description: 'จำฉันไว้ — ยืดอายุ refresh token (session ยาวขึ้น)' })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}