import { IsDateString, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { APPOINTMENT_STATUSES, AppointmentStatus } from '../../../database/entities/appointment.entity';

const TIME = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export class CreateAppointmentDto {
  @IsInt()
  @Type(() => Number)
  patient_id: number;

  @IsDateString()
  appointment_date: string;

  @Matches(TIME, { message: 'start_time ต้องเป็นรูปแบบ HH:mm' })
  start_time: string;

  @IsOptional()
  @Matches(TIME, { message: 'end_time ต้องเป็นรูปแบบ HH:mm' })
  end_time?: string | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  service: string;

  @IsOptional()
  @IsIn(APPOINTMENT_STATUSES as unknown as string[])
  status?: AppointmentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;
}

export class UpdateAppointmentDto extends PartialType(CreateAppointmentDto) {}

export class QueryAppointmentDto {
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @IsOptional()
  @IsDateString()
  date_to?: string;

  @IsOptional()
  @IsIn(APPOINTMENT_STATUSES as unknown as string[])
  status?: AppointmentStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  patient_id?: number;

  // ชื่อ/รหัสคนไข้ หรือบริการ
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 200;
}
