import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json } from 'express';
import * as cookieParser from 'cookie-parser';
import * as csurf from 'csurf';
import { ValidationPipe } from '@nestjs/common';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. เปิด CORS ก่อน middleware อื่น
  app.enableCors({
    origin: 'http://localhost:4200',
    credentials: true,
  });

  app.use(cookieParser());
  app.use(json());

  app.setGlobalPrefix('api');

  const csrfProtection = csurf({
    cookie: {
      httpOnly: false,  // ⚠️ production ควร true
      sameSite: 'strict',
      secure: false,
    },
  });

  const skipPaths = [
    '/api/auth/login',
    '/api/auth/guest',
    '/api/openapi',
    '/api-json',
  ];

  app.use((req, res, next) => {
    if (
      skipPaths.includes(req.path) ||
      req.path.startsWith('/api/openapi') ||
      req.path.startsWith('/api-json')
    ) {
      return next();
    }
    csrfProtection(req, res, next);
  });

  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Kornpassorn Care API')
    .setDescription('API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/openapi', app, document);

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
