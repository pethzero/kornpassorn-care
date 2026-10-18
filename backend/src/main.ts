// ต้องเป็นบรรทัดแรก: โหลด .env.<NODE_ENV> ก่อน config อื่นถูก import (ดู config/load-env.ts)
import './config/load-env';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json } from 'express';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { csrfExcludeMiddleware } from './common/middleware/csrf-exclude.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.use(json());
  app.use(csrfExcludeMiddleware);
  app.enableCors({
    origin: true, // ✅ อนุญาตทุก origin
    credentials: true,
    // origin: 'http://localhost:4200',
    // credentials: true,

    // origin: [
    //   'http://localhost:4200',
    //   'https://3ec7464f696c.ngrok-free.app', // 👈 เพิ่ม ngrok URL
    // ],
    // credentials: true,
    
    // origin: (origin, callback) => {
    //   if (!origin || origin.includes('localhost') || origin.includes('ngrok-free.app')) {
    //     callback(null, true);
    //   } else {
    //     callback(new Error('Not allowed by CORS'));
    //   }
    // },
    // credentials: true,
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  // Swagger (/api/openapi) — ปิดได้ด้วย SWAGGER_ENABLED=false (production ปิดไว้ ไม่ให้คนนอกเห็นรายการ API ทั้งหมด)
  if (process.env.SWAGGER_ENABLED !== 'false') {
    const config = new DocumentBuilder()
      .setTitle('Kornpassorn Care API')
      .setDescription('API documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/openapi', app, document);
  }
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`[${process.env.NODE_ENV || 'dev'}] listening on :${port} · database "${process.env.DB_NAME || 'kornpassorn_db_dev'}"`);
}
bootstrap();
