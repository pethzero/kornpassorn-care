import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsPositive, IsString, MaxLength, ValidateNested } from 'class-validator';

// เพดานกันส่งข้อมูลยักษ์ (คนจริงไม่มีทางถึง)
const MAX_ANSWERS = 100;

export class QuestionnaireAnswerDto {
  @ApiProperty()
  @IsInt()
  @IsPositive()
  question_id: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  answer_text?: string;
}

export class SubmitQuestionnaireDto {
  @ApiProperty({ type: [QuestionnaireAnswerDto] })
  @IsArray()
  @ArrayMaxSize(MAX_ANSWERS)
  @ValidateNested({ each: true })
  @Type(() => QuestionnaireAnswerDto)
  answers: QuestionnaireAnswerDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @ApiPropertyOptional({ description: 'สำหรับ guest ที่ไม่มี Patient record — ไม่บังคับ' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  guest_first_name?: string;

  @ApiPropertyOptional({ description: 'สำหรับ guest ที่ไม่มี Patient record — ไม่บังคับ' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  guest_last_name?: string;
}
