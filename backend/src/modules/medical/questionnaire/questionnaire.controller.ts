import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards, ValidationPipe } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

import { QuestionnaireService } from './questionnaire.service';
import { SubmitQuestionnaireDto } from './dto/submit-questionnaire.dto';

@ApiTags('questionnaire')
@ApiBearerAuth()
@Controller('questionnaire')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuestionnaireController {
  constructor(private readonly service: QuestionnaireService) {}

  // guest (anonymous, ไม่มี Patient record) เข้ามากรอกได้ด้วย — ดู submit() ด้านล่างว่า patient_id จะเป็น null
  // กด F5 รัว ๆ — รายการคำถาม cache ใน service อยู่แล้ว แค่กันยิงถล่ม
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Roles('patient', 'guest')
  @Get('questions')
  listQuestions() {
    return this.service.listActiveQuestions();
  }

  // คนจริงส่งไม่กี่ครั้ง — 3 ครั้ง/นาที/IP · field แปลกปลอม = ปฏิเสธ (whitelist เฉพาะ endpoint นี้ ไม่กระทบที่อื่น)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Roles('patient', 'guest')
  @Post('submit')
  submit(@Req() req: any, @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })) dto: SubmitQuestionnaireDto) {
    const patientId = req.user.role === 'patient' ? Number(req.user.userId) : null;
    return this.service.submit(patientId, dto);
  }

  @Roles('patient')
  @Get('my')
  myQuestionnaires(@Req() req: any) {
    return this.service.listForPatient(Number(req.user.userId));
  }

  @Roles('user', 'admin')
  @Get()
  listAll(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.service.listAll(limit ? Number(limit) : undefined, offset ? Number(offset) : undefined);
  }

  @Roles('user', 'admin')
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.service.getDetail(Number(id));
  }

  @Roles('user', 'admin')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.service.updateStatus(Number(id), status);
  }
}
