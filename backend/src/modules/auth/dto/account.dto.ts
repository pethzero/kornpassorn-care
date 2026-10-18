import { IsBoolean, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export const STAFF_ROLES = ['admin', 'user'] as const;

// แก้ข้อมูลตัวเอง
export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  first_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  last_name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'รูปแบบอีเมลไม่ถูกต้อง' })
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone_number?: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  current_password: string;

  @IsString()
  @MinLength(6, { message: 'รหัสผ่านใหม่ต้องยาวอย่างน้อย 6 ตัวอักษร' })
  new_password: string;
}

// admin สร้างผู้ใช้
export class CreateStaffUserDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9._-]{3,50}$/, { message: 'ชื่อผู้ใช้ 3–50 ตัว ใช้ a-z 0-9 . _ - เท่านั้น' })
  username: string;

  @IsString()
  @MinLength(6, { message: 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร' })
  password: string;

  @IsIn(STAFF_ROLES as unknown as string[])
  role: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  first_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  last_name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'รูปแบบอีเมลไม่ถูกต้อง' })
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone_number?: string;
}

export class UpdateStaffUserDto extends UpdateAccountDto {
  @IsOptional()
  @IsIn(STAFF_ROLES as unknown as string[])
  role?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(6, { message: 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร' })
  new_password: string;
}
