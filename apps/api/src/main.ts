import 'dotenv/config';
import * as net from 'net';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WinstonModule } from 'nest-winston';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { createLoggerConfig } from './common/logger/logger.config';

function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port);
  });
}

async function findFreePort(start: number): Promise<number> {
  for (let port = start; port < start + 100; port++) {
    if (await isPortFree(port)) return port;
  }
  throw new Error(`No free port found in range ${start}-${start + 99}`);
}

async function bootstrap() {
  const logger = WinstonModule.createLogger(createLoggerConfig());

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    logger,
  });

  const configService = app.get(ConfigService);

  const frontendUrl = configService.get<string>('FRONTEND_URL');
  const allowedOrigins = frontendUrl
    ? frontendUrl.split(',').map((u) => u.trim())
    : [];
  // Tauri 데스크탑 앱의 origin 추가
  const tauriOrigins = ['tauri://localhost', 'https://tauri.localhost'];
  const allOrigins = [...new Set([...allowedOrigins, ...tauriOrigins])];
  app.enableCors({
    origin: allOrigins.length > 0 ? allOrigins : true,
    credentials: true,
  });

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  // Serve uploaded files
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('ito API')
    .setDescription('ito — collaborative thread-based task management')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const preferredPort = parseInt(configService.get('API_PORT', '3011'), 10);
  const port = await findFreePort(preferredPort);
  await app.listen(port);

  const url = await app.getUrl();
  logger.log(`ito API running at ${url}`);
  logger.log(`Swagger docs at ${url}/api/docs`);
}
bootstrap();
