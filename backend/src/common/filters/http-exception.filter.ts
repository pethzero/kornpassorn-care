import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const message = exception.message || 'Internal server error';
    // 429 จาก IpThrottlerGuard — บอกหน้าเว็บว่าต้องรอกี่วินาที (แถบนับถอยหลัง)
    const retryAfter = exception instanceof HttpException ? (exception.getResponse() as any)?.retry_after : undefined;

    // Log เฉพาะ error message (ไม่แสดง stack trace)
    console.error(`[ERROR] ${status}: ${message}`);

    response.status(status).json({
      statusCode: status,
      message,
      ...(retryAfter ? { retry_after: retryAfter } : {}),
      timestamp: new Date().toISOString(),
    });
  }
}