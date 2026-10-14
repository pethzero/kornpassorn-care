import { Body, Controller, Get, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Config } from '../../config';
import { buildDeviceInfo } from '../../utils/device.util';

import { PatientAuthService } from './patient-auth.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { UpdatePatientProfileDto } from './dto/update-profile.dto';

@ApiTags('patient-auth')
@Controller('patient-auth')
export class PatientAuthController {
  constructor(private readonly patientAuthService: PatientAuthService) {}

  @Post('otp/request')
  async requestOtp(@Body() dto: RequestOtpDto) {
    return this.patientAuthService.requestOtp(dto.phone);
  }

  @Post('otp/verify')
  async verifyOtp(@Body() dto: VerifyOtpDto, @Req() req: Request, @Res() res: Response) {
    const deviceInfo = buildDeviceInfo(req);
    const { patient, tokens } = await this.patientAuthService.verifyOtp(dto.phone, dto.otp, req, deviceInfo);

    res.cookie(
      'refresh_token',
      tokens.refreshToken,
      Config.token.refreshCookieOptions(tokens.refreshExpiresInSeconds * 1000),
    );

    return res.json({
      success: true,
      access_token: tokens.accessToken,
      expires_in: tokens.accessExpiresInSeconds,
      patient: {
        id: patient.id,
        first_name: patient.first_name,
        last_name: patient.last_name,
        phone: patient.phone,
        needsProfile: patient.first_name === '-',
      },
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('patient')
  @Get('me')
  async me(@Req() req: any) {
    return this.patientAuthService.getProfile(Number(req.user.userId));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('patient')
  @Patch('me')
  async updateMe(@Req() req: any, @Body() dto: UpdatePatientProfileDto) {
    return this.patientAuthService.updateProfile(Number(req.user.userId), dto);
  }
}
