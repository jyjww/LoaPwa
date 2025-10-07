// src/cache/app-cache.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class AppCache {
  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

  async getOrSet<T>(key: string, ttlSec: number, loader: () => Promise<T>): Promise<T> {
    try {
      const hit = await this.cache.get<T>(key);
      if (hit != null) return hit;
    } catch (e) {
      console.warn('[Cache] get failed:', (e as Error).message);
    }

    const fresh = await loader();

    try {
      await this.cache.set(key, fresh, ttlSec * 1000);
    } catch (e) {
      console.warn('[Cache] set failed:', (e as Error).message);
    }

    return fresh;
  }

  async del(key: string) {
    try {
      await this.cache.del(key);
    } catch (e) {
      console.warn('[Cache] del failed:', (e as Error).message);
    }
  }
}
