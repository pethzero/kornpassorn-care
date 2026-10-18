import { BadRequestException, Body, Controller, Get, Headers, HttpCode, Param, ParseIntPipe, Post, Query, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ApiClientGuard, ApiScopes } from '../api-clients/api-client.guard';
import { ApiClientService } from '../api-clients/api-client.service';
import { AppointmentService } from '../appointments/appointment.service';
import { HospitalScheduleService } from '../hospital-schedule/hospital-schedule.service';
import { Appointment, APPOINTMENT_STATUSES } from '../../database/entities/appointment.entity';

const MAX_RANGE_DAYS = 93;
const ymd = (d: Date) => d.toISOString().slice(0, 10);

// API สาธารณะสำหรับระบบภายนอก — /api/v1/*  (เอกสาร: หน้า /developers ของเว็บ)
// ยืนยันตัวด้วย api_clients เท่านั้น ไม่ใช่ user ของคน
@ApiTags('public-api-v1')
@Controller('v1')
export class PublicApiController {
  constructor(
    private readonly clients: ApiClientService,
    private readonly appointments: AppointmentService,
    private readonly schedule: HospitalScheduleService,
  ) {}

  // POST /api/v1/oauth/token — OAuth2 client credentials
  // รับ client_id/client_secret ใน body (JSON หรือ form) หรือ HTTP Basic
  // ตอบ error ตามมาตรฐาน OAuth2 ({ error, error_description }) ให้ไลบรารีฝั่งผู้เชื่อมต่อเข้าใจได้
  @Post('oauth/token')
  @HttpCode(200)
  async token(@Body() body: Record<string, string>, @Headers('authorization') auth: string | undefined, @Res() res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    let clientId = body?.client_id;
    let clientSecret = body?.client_secret;
    if ((!clientId || !clientSecret) && auth?.toLowerCase().startsWith('basic ')) {
      const [id, secret] = Buffer.from(auth.slice(6), 'base64').toString().split(':');
      clientId = decodeURIComponent(id || '');
      clientSecret = decodeURIComponent(secret || '');
    }
    if ((body?.grant_type || 'client_credentials') !== 'client_credentials') {
      return res.status(400).json({ error: 'unsupported_grant_type', error_description: 'รองรับเฉพาะ client_credentials' });
    }
    if (!clientId || !clientSecret) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'ต้องส่ง client_id และ client_secret' });
    }
    try {
      return res.json(await this.clients.issueToken(clientId, clientSecret));
    } catch (e) {
      if (e instanceof UnauthorizedException) {
        return res.status(401).json({ error: 'invalid_client', error_description: 'client_id หรือ client_secret ไม่ถูกต้อง หรือถูกปิดใช้งาน' });
      }
      throw e;
    }
  }

  // GET /api/v1/appointments?date_from=&date_to=&status=
  @Get('appointments')
  @UseGuards(ApiClientGuard)
  @ApiScopes('appointments:read')
  async listAppointments(
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('status') status?: string,
  ) {
    const from = dateFrom || ymd(new Date());
    const to = dateTo || ymd(new Date(Date.now() + 30 * 86400000));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      throw new BadRequestException('date_from / date_to ต้องเป็นรูปแบบ YYYY-MM-DD');
    }
    const days = (new Date(to).getTime() - new Date(from).getTime()) / 86400000;
    if (days < 0) throw new BadRequestException('date_from ต้องไม่เกิน date_to');
    if (days > MAX_RANGE_DAYS) throw new BadRequestException(`ช่วงวันที่ยาวได้ไม่เกิน ${MAX_RANGE_DAYS} วัน`);
    if (status && !(APPOINTMENT_STATUSES as readonly string[]).includes(status)) {
      throw new BadRequestException(`status ต้องเป็น ${APPOINTMENT_STATUSES.join(' | ')}`);
    }

    const rows = await this.appointments.findAll({ date_from: from, date_to: to, status: status as any, limit: 500 });
    return { data: rows.map((a) => this.toPublicAppointment(a)), meta: { date_from: from, date_to: to, count: rows.length } };
  }

  // GET /api/v1/appointments/:id
  @Get('appointments/:id')
  @UseGuards(ApiClientGuard)
  @ApiScopes('appointments:read')
  async getAppointment(@Param('id', ParseIntPipe) id: number) {
    return { data: this.toPublicAppointment(await this.appointments.findOne(id)) };
  }

  // GET /api/v1/clinic/hours — เวลาทำการรายสัปดาห์ + วันพิเศษที่จะถึง
  @Get('clinic/hours')
  @UseGuards(ApiClientGuard)
  @ApiScopes('clinic:read')
  async clinicHours() {
    const { weekly, specialDays } = await this.schedule.getPublicSchedule();
    const t = (v?: string | null) => (v ? v.slice(0, 5) : null);
    return {
      data: {
        weekly: weekly.map((w) => ({ day_of_week: w.day_of_week, is_closed: w.is_closed, open_time: t(w.open_time), close_time: t(w.close_time), note: w.note ?? null })),
        special_days: specialDays.map((d: any) => ({ date: d.date, is_closed: d.is_closed, open_time: t(d.open_time), close_time: t(d.close_time), note: d.note ?? null })),
      },
    };
  }

  // ส่งออกเฉพาะข้อมูลที่จำเป็น — ไม่มีเบอร์โทร เลขบัตร ที่อยู่ หรือหมายเหตุภายใน
  private toPublicAppointment(a: Appointment) {
    const p = a.patient;
    return {
      id: a.id,
      date: a.appointment_date,
      start_time: a.start_time?.slice(0, 5),
      end_time: a.end_time ? a.end_time.slice(0, 5) : null,
      service: a.service,
      status: a.status,
      patient: p ? { code: p.patient_code, display_name: `${p.first_name} ${p.last_name ? p.last_name.trim().charAt(0) + '.' : ''}`.trim() } : null,
    };
  }
}
