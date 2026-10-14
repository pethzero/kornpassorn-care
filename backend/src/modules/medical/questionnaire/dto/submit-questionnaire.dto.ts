import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';

export class QuestionnaireAnswerDto {
  @ApiProperty()
  @IsInt()
  question_id: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  answer_text?: string;
}

export class SubmitQuestionnaireDto {
  @ApiProperty({ type: [QuestionnaireAnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionnaireAnswerDto)
  answers: QuestionnaireAnswerDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: 'สำหรับ guest ที่ไม่มี Patient record — ไม่บังคับ' })
  @IsOptional()
  @IsString()
  guest_first_name?: string;

  @ApiPropertyOptional({ description: 'สำหรับ guest ที่ไม่มี Patient record — ไม่บังคับ' })
  @IsOptional()
  @IsString()
  guest_last_name?: string;
}
