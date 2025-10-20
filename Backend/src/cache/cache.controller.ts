// src/cache/cache.controller.ts
import { Controller, Get, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Controller('cache')
export class CacheController {
  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

  @Get('ping')
  async ping() {
    await this.cache.set('health:ping', 'pong', 10_000);
    const val = await this.cache.get<string>('health:ping');
    return { ok: val === 'pong', val };
  }
}
