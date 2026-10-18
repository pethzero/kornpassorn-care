import { ArrayMinSize, IsArray, IsBoolean, IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { API_SCOPES } from '../../../database/entities/api-client.entity';

const SCOPE_KEYS = Object.keys(API_SCOPES);

export class CreateApiClientDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(SCOPE_KEYS, { each: true })
  scopes: string[];

  @IsOptional()
  @IsDateString()
  expires_at?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string | null;
}

export class UpdateApiClientDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(SCOPE_KEYS, { each: true })
  scopes?: string[];

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsDateString()
  expires_at?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string | null;
}
