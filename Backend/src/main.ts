import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import cookieParser from 'cookie-parser';
import 'reflect-metadata';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'], // ← debug 로그가 보여야 함
  });

  const dataSource = app.get(DataSource);
  if (process.env.MIGRATE_ON_BOOT === '1') {
    console.log('[BOOT] Running TypeORM migrations...');
    await dataSource.runMigrations();
  }

  app.use(cookieParser());

  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = Number(process.env.PORT) || 8080;
  console.log(`[DEBUG] Final Port is: ${port}`);
  await app.listen(port, '0.0.0.0');
  console.log(`[bootstrap] listening on ${port}`);
}
bootstrap();
