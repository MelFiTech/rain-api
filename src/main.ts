import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { existsSync } from 'fs';
import { join } from 'path';
import express from 'express';
import { AppModule } from './app.module';

function assertProductionSecrets() {
  if (process.env.NODE_ENV !== 'production') return;
  const jwt = process.env.JWT_SECRET?.trim();
  if (!jwt || jwt.length < 32 || jwt.includes('change-me')) {
    throw new Error(
      'JWT_SECRET must be set to a strong random value in production.',
    );
  }
}

async function bootstrap() {
  assertProductionSecrets();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Rain API')
    .setDescription(
      'Rain platform API — JWT-authenticated dashboard routes under /platform, developer API under /v1.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'jwt',
    )
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'API Key' },
      'api-key',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('swagger', app, document);

  const adminDir = join(process.cwd(), 'public', 'admin');
  if (existsSync(join(adminDir, 'index.html'))) {
    const server = app.getHttpAdapter().getInstance();

    server.use((req, res, next) => {
      const pathOnly = req.originalUrl.split('?')[0] ?? '';
      if (
        (req.method === 'GET' || req.method === 'HEAD') &&
        pathOnly === '/admin'
      ) {
        res.redirect(301, '/admin/');
        return;
      }
      next();
    });

    server.use(
      '/admin',
      express.static(adminDir, { index: 'index.html', redirect: false }),
    );
    server.use('/admin', (req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        next();
        return;
      }
      const pathOnly = req.originalUrl.split('?')[0] ?? '';
      if (!pathOnly.startsWith('/admin/')) {
        next();
        return;
      }
      if (/\.[a-zA-Z0-9]+$/.test(pathOnly)) {
        next();
        return;
      }
      res.sendFile(join(adminDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT ?? 9090);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Rain API listening on http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(`OpenAPI docs at http://localhost:${port}/swagger`);
  if (existsSync(join(adminDir, 'index.html'))) {
    // eslint-disable-next-line no-console
    console.log(`Rain Admin UI at http://localhost:${port}/admin/`);
  }
}

void bootstrap();
