import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { existsSync, readdirSync } from 'fs';
import { DataSource } from 'typeorm';
import cookieParser from 'cookie-parser';
import { PrincipalResolver } from './auth/principal.resolver';
import 'reflect-metadata';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'], // ← debug 로그가 보여야 함
  });
  app.setGlobalPrefix('api');

  // DB 연결 및 마이그레이션은 선택적 - 실패해도 부팅 지속
  try {
    const dataSource = app.get(DataSource);
    const [{ current_database, current_user, current_schema, search_path }] =
      await dataSource.query(`
      select
        current_database(),
        current_user,
        current_schema(),
        current_setting('search_path') as search_path
    `);
    console.log('[DB]', { current_database, current_user, current_schema, search_path });

    console.log('[MIGR] __dirname =', __dirname);
    console.log('[MIGR] dir exists?', existsSync(__dirname + '/migrations'));
    if (existsSync(__dirname + '/migrations')) {
      console.log('[MIGR] files =', readdirSync(__dirname + '/migrations'));
    }
    console.log(
      '[MIGR] DS.migrations =',
      dataSource.migrations?.map((m) => m.name),
    );

    // MIGRATE_ON_BOOT 기본값은 false (Cloud Run 첫 부팅 테스트용)
    if (process.env.MIGRATE_ON_BOOT === '1') {
      console.log('[BOOT] Running TypeORM migrations...');
      await dataSource.runMigrations();
    }
  } catch (error) {
    console.warn(
      '[DB] Database connection or migration failed, continuing startup:',
      error.message,
    );
  }

  app.use(cookieParser());

  // PrincipalResolver 미들웨어 등록
  const principalResolver = app.get(PrincipalResolver);
  app.use(principalResolver.use.bind(principalResolver));

  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Anon-Id'],
  });

  const port = Number(process.env.PORT) || 8080;
  console.log(`[DEBUG] Final Port is: ${port}`);
  await app.listen(port, '0.0.0.0');
  console.log(`[bootstrap] listening on ${port}`);
  app
    .getHttpAdapter()
    .getInstance()
    .get('/healthz', (_req, res) => res.status(200).send('ok'));
}
bootstrap();
