import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateSpecialDayDto {
  @ApiProperty({ example: '2026-04-13' })
  @IsDateString()
  date: string;

  @ApiProperty()
  @IsBoolean()
  is_closed: boolean;

  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @IsString()
  open_time?: string;

  @ApiPropertyOptional({ example: '16:00' })
  @IsOptional()
  @IsString()
  close_time?: string;

  @ApiPropertyOptional({ example: 'หยุดวันสงกรานต์' })
  @IsOptional()
  @IsString()
  note?: string;
}
