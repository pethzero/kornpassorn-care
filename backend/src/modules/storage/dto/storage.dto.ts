import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { CABINET_ROTATIONS, COMPARTMENT_FRONTS, CompartmentFront } from '../../../database/entities/storage.entity';

export class CompartmentDto {
  // มี id = แก้ช่องเดิม · ไม่มี = ช่องใหม่ (ตอนแก้ตู้ ช่องที่ไม่ได้ส่งมาจะถูกลบ)
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  id?: number;

  @ApiProperty({ example: 'A' })
  @IsString()
  @MaxLength(10)
  code: string;

  @ApiPropertyOptional({ example: 'ชั้นบน (บานกระจก)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string | null;

  @ApiProperty() @IsInt() @Min(0) @Max(1000) x_cm: number;
  @ApiProperty() @IsInt() @Min(0) @Max(1000) y_cm: number;
  @ApiProperty() @IsInt() @Min(5) @Max(1000) width_cm: number;
  @ApiProperty() @IsInt() @Min(5) @Max(1000) height_cm: number;

  @ApiProperty({ enum: COMPARTMENT_FRONTS })
  @IsIn(COMPARTMENT_FRONTS as unknown as string[])
  front: CompartmentFront;

  @ApiPropertyOptional({ default: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2)
  door_count?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  levels?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  has_lock?: boolean;
}

export class CreateCabinetDto {
  @ApiProperty({ example: 'C1' })
  @IsString()
  @MaxLength(20)
  code: string;

  @ApiProperty({ example: 'ตู้ยา 1' })
  @IsString()
  @MaxLength(100)
  name: string;

  // ห้องที่ตั้งตู้ + ตำแหน่งในห้อง (ดู storage.entity.ts)
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  room_id?: number | null;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(5000) pos_x_cm?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(5000) pos_z_cm?: number;

  @ApiPropertyOptional({ enum: CABINET_ROTATIONS })
  @IsOptional()
  @IsIn(CABINET_ROTATIONS as unknown as number[])
  rotation?: number;

  @ApiProperty() @IsInt() @Min(20) @Max(1000) width_cm: number;
  @ApiProperty() @IsInt() @Min(20) @Max(1000) height_cm: number;
  @ApiProperty() @IsInt() @Min(10) @Max(300) depth_cm: number;

  @ApiPropertyOptional({ example: '#d5dade' })
  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string | null;

  @ApiProperty({ type: [CompartmentDto] })
  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => CompartmentDto)
  compartments: CompartmentDto[];
}

export class UpdateCabinetDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) name?: string;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsInt() room_id?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(5000) pos_x_cm?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(5000) pos_z_cm?: number;
  @ApiPropertyOptional() @IsOptional() @IsIn(CABINET_ROTATIONS as unknown as number[]) rotation?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(20) @Max(1000) width_cm?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(20) @Max(1000) height_cm?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(10) @Max(300) depth_cm?: number;
  @ApiPropertyOptional() @IsOptional() @Matches(/^#[0-9a-fA-F]{6}$/) color?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) note?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_active?: boolean;

  // ส่งมา = แทนที่รายการช่องทั้งหมด (ช่องที่มีของอยู่ห้ามลบ)
  @ApiPropertyOptional({ type: [CompartmentDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => CompartmentDto)
  compartments?: CompartmentDto[];
}

// ย้ายล็อตเข้าช่อง/ชั้น · compartment_id = null → เอาออกจากตู้ (ยังไม่ระบุที่เก็บ)
export class SetLotLocationDto {
  @ApiProperty({ nullable: true })
  @IsOptional()
  @IsInt()
  compartment_id: number | null;

  @ApiPropertyOptional({ description: 'ชั้น 1 = บนสุด · ไม่ส่ง = ชั้น 1' })
  @IsOptional()
  @IsInt()
  @Min(1)
  level?: number | null;
}

// ----- ห้อง -----

export class CreateRoomDto {
  @ApiProperty({ example: 'A' })
  @IsString()
  @MaxLength(20)
  code: string;

  @ApiProperty({ example: 'ห้อง A' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty() @IsInt() @Min(100) @Max(5000) width_cm: number;
  @ApiProperty() @IsInt() @Min(100) @Max(5000) depth_cm: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string | null;
}

export class UpdateRoomDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(100) @Max(5000) width_cm?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(100) @Max(5000) depth_cm?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) note?: string | null;
}

export class PlacementDto {
  @ApiProperty() @IsInt() cabinet_id: number;
  @ApiProperty() @IsInt() @Min(0) @Max(5000) pos_x_cm: number;
  @ApiProperty() @IsInt() @Min(0) @Max(5000) pos_z_cm: number;
  @ApiProperty({ enum: CABINET_ROTATIONS }) @IsIn(CABINET_ROTATIONS as unknown as number[]) rotation: number;
}

// บันทึกผังห้องทีเดียว (ลากหลายตู้แล้วกดบันทึก) — ส่งเฉพาะตู้ที่อยู่ในห้องนี้
export class SaveLayoutDto {
  @ApiProperty({ type: [PlacementDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => PlacementDto)
  items: PlacementDto[];
}
