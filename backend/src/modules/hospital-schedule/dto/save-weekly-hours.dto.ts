import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

export class WeeklyHoursDayDto {
  @ApiProperty({ minimum: 0, maximum: 6, description: '0=อาทิตย์ .. 6=เสาร์' })
  @IsInt()
  @Min(0)
  @Max(6)
  day_of_week: number;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class SaveWeeklyHoursDto {
  @ApiProperty({ type: [WeeklyHoursDayDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklyHoursDayDto)
  days: WeeklyHoursDayDto[];
}
