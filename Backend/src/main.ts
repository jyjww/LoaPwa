import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'], // ← debug 로그가 보여야 함
  });

  app.use(cookieParser());

  app.enableCors({
    origin: [
      (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(','),
      'db3c7fd4cc7d.ngrok-free.app',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.listen(process.env.PORT || 4000);
}
bootstrap();
