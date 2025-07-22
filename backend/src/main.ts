import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json } from 'express';
import * as cookieParser from 'cookie-parser';
import * as csurf from 'csurf';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.use(json());

  app.setGlobalPrefix('api');

  const csrfProtection = csurf({
    cookie: {
      httpOnly: false,  // ⚠️ ใน production ควรตั้งเป็น true
      sameSite: 'strict',
      secure: false,    // ✅ ใช้ true ถ้า deploy แบบ HTTPS
    },
  });

  const skipPaths = ['/api/auth/login', '/api/auth/guest']; // ❌ เอา csrf-token ออก

  app.use((req, res, next) => {
    if (skipPaths.includes(req.path)) {
      return next();
    }
    csrfProtection(req, res, next);
  });

  app.enableCors({
    origin: 'http://localhost:4200',
    credentials: true,
  });

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
