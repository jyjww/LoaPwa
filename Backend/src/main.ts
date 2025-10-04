import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { existsSync, readdirSync } from 'fs';
import { DataSource } from 'typeorm';
import cookieParser from 'cookie-parser';
import 'reflect-metadata';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'], // ← debug 로그가 보여야 함
  });

  const dataSource = app.get(DataSource);
  const [{ current_database, current_user, current_schema, search_path }] = await dataSource.query(`
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
