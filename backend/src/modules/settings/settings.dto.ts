import { ArrayMaxSize, IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ClinicInfoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @IsOptional() @IsString() @MaxLength(100) email?: string;
  @IsOptional() @IsString() @MaxLength(20) tax_id?: string;
  @IsOptional() @IsString() @MaxLength(100) line_id?: string;
}

export class ServiceItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  // ราคาตั้งต้น (เติมให้ในเอกสารบริการคนไข้ แก้ได้ทุกครั้ง) — null = ไม่ตั้ง
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number | null;

  @IsBoolean()
  active: boolean;
}

export class ClinicSettingsDto {
  @ValidateNested()
  @Type(() => ClinicInfoDto)
  clinic: ClinicInfoDto;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ServiceItemDto)
  services: ServiceItemDto[];
}
