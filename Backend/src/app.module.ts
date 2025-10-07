// src/app.module.ts (교체본)
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import * as Joi from 'joi';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuctionModule } from './auctions/auction.module';
import { MarketModule } from './markets/market.module';
import { AuthModule } from './auth/auth.module';
import { FavoritesModule } from './favorites/favorite.module';
import { FcmModule } from './fcm/fcm.module';
import { AppCacheModule } from './cache/cache.module';
import { WatchModule } from './watch/watch.module';

const isProd = process.env.NODE_ENV === 'production';

@Module({
  imports: [
    // 1) Config: prod는 파일 안 읽고, dev만 .env.development 사용
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: isProd ? undefined : '.env.development',
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').required(),
        MIGRATE_ON_BOOT: Joi.string().valid('0', '1').default('0'),

        // ▶️ DB: prod에서는 개별 항목 필수, dev는 DATABASE_URL 허용
        DATABASE_URL: Joi.string().uri().allow('').optional(),
        DB_HOST: Joi.string().when('NODE_ENV', {
          is: 'production',
          then: Joi.required(), // 예: /cloudsql/<PROJECT>:<REGION>:<INSTANCE>
          otherwise: Joi.optional(),
        }),
        DB_PORT: Joi.number().integer().default(5432),
        DB_NAME: Joi.string().when('NODE_ENV', {
          is: 'production',
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        DB_USER: Joi.string().when('NODE_ENV', {
          is: 'production',
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        DB_PASSWORD: Joi.string().allow('').optional(), // 시크릿으로 주입 권장

        // OAuth / 외부키
        GOOGLE_CLIENT_ID: Joi.string().allow('').optional(),
        GOOGLE_CLIENT_SECRET: Joi.string().allow('').optional(),
        GOOGLE_CALLBACK_URL: Joi.string().allow('').optional(),

        // Lost Ark API 키는 없어도 앱이 죽지 않게
        LOSTARK_API_KEY: Joi.string().allow('').optional(),

        // FCM (없으면 푸시 기능만 비활성)
        FCM_PROJECT_ID: Joi.string().allow('').optional(),
        FCM_CLIENT_EMAIL: Joi.string().allow('').optional(),
        FCM_PRIVATE_KEY: Joi.string().allow('').optional(),

        // 기타
        CORS_ORIGIN: Joi.string().allow('').optional(),
        API_URL: Joi.string().allow('').optional(),
        FRONTEND_URL: Joi.string().allow('').optional(),
        PORT: Joi.number().optional(), // Cloud Run이 8080 넣어줌
      }),
    }),

    // 2) TypeORM: dev는 DATABASE_URL, prod는 개별 항목(Cloud SQL 소켓 포함)
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        console.log('[BOOTCFG]', {
          NODE_ENV: process.env.NODE_ENV,
          DATABASE_URL: process.env.DATABASE_URL,
          using:
            process.env.NODE_ENV !== 'production' && process.env.DATABASE_URL
              ? 'DEV_URL'
              : 'PROD_FIELDS',
        });
        const prod = cfg.get<'development' | 'test' | 'production'>('NODE_ENV') === 'production';
        const url = cfg.get<string>('DATABASE_URL');
        const syncOnBoot = cfg.get<string>('SYNC_ON_BOOT') === '1';

        if (!prod && url) {
          // 로컬/개발: DATABASE_URL로 간단히
          return {
            type: 'postgres',
            url,
            autoLoadEntities: true,
            synchronize: true, // 개발만
          };
        }

        // 배포/프로덕션: Cloud SQL 소켓 방식 (DB_HOST=/cloudsql/PROJECT:REGION:INSTANCE)
        return {
          type: 'postgres',
          host: cfg.get<string>('DB_HOST'), // 예) /cloudsql/loapwa-d0c74:asia-northeast3:loa-pg
          port: cfg.get<number>('DB_PORT', 5432),
          username: cfg.get<string>('DB_USER'),
          password: cfg.get<string>('DB_PASSWORD'),
          database: cfg.get<string>('DB_NAME'),
          autoLoadEntities: true,
          synchronize: syncOnBoot, // 운영은 false 권장
          migrationsRun: false, // main.ts 에서 제어
          migrations: [__dirname + '/migrations/*.js'],
          schema: 'public',
        };
      },
    }),

    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),

    TerminusModule,
    AuctionModule,
    MarketModule,
    AuthModule,
    FavoritesModule,
    FcmModule,
    AppCacheModule,
    WatchModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
