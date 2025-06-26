import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json } from 'express';
import * as cookieParser from 'cookie-parser';
import * as csurf from 'csurf';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ใช้ cookie-parser และ json middleware
  app.use(cookieParser()); // ใช้ก่อน csrf
  app.use(json());

  // ตั้ง global prefix
  app.setGlobalPrefix('api'); // prefix ก่อน middleware

  // ตั้งค่า CSRF protection
  const csrfProtection = csurf({
    cookie: {
      httpOnly: false, // ให้สามารถเข้าถึง cookie ผ่าน JavaScript ได้
      sameSite: 'strict',
      secure: false, // เปลี่ยนเป็น true ถ้าใช้ https
    },
  });

  // ใช้ csrfProtection middleware กับทุก request ยกเว้นที่อยู่ใน skipPaths
  app.use((req, res, next) => {
    const skipPaths = ['/api/auth/login', '/api/auth/guest', '/api/auth/csrf-token'];
    if (skipPaths.includes(req.path)) {
      return next(); // ข้าม csrf สำหรับเส้นทางเหล่านี้
    }
    csrfProtection(req, res, next); // ใช้ csrf protection สำหรับเส้นทางที่เหลือ
  });

  // ตั้งค่า CORS
  app.enableCors({
    origin: 'http://localhost:4200',  // URL ของ frontend
    credentials: true, // อนุญาตให้ใช้ cookies, HTTP authentication
  });

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
