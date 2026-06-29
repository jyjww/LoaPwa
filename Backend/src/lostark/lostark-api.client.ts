// src/lostark/lostark-api.client.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { createHash } from 'crypto';
import { RedisService } from '@/cache/redis.service';
import {
  LostArkRateLimitError,
  LostArkApiKeyInvalidError,
  LostArkApiForbiddenError,
  LostArkApiServerError,
  LostArkCooldownError,
} from './errors';

export interface CallOptions {
  method: 'GET' | 'POST';
  path: string;
  body?: Record<string, any>;
  params?: Record<string, string | number>;
  /** Override the app-level API key with a user-supplied key. */
  userApiKey?: string;
  /** Request timeout in milliseconds (default: 7000). */
  timeout?: number;
}

interface RateLimitState {
  limit: number;
  remaining: number;
  resetAt: number;
  updatedAt: number;
}

@Injectable()
export class LostArkApiClient {
  private readonly logger = new Logger(LostArkApiClient.name);
  private readonly BASE_URL = 'https://developer-lostark.game.onstove.com';
  private readonly appApiKey: string;

  constructor(
    private readonly http: HttpService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {
    const key = this.config.get<string>('LOSTARK_API_KEY');
    if (!key) throw new Error('LOSTARK_API_KEY is not configured');
    this.appApiKey = key;
  }

  /**
   * Execute a LostArk API request.
   *
   * - Checks cooldown state before every request.
   * - Tracks X-RateLimit-* response headers after every request.
   * - Automatically enters cooldown when remaining < 10 or 429 is received.
   */
  async call<T = any>(options: CallOptions): Promise<T> {
    const apiKey = options.userApiKey ?? this.appApiKey;
    const keyHash = this.hashKey(apiKey);
    const timeout = options.timeout ?? 7000;

    // ── Guard: reject immediately if the key is cooling down ──────────────
    const cooldownKey = `ratelimit:cooldown:${keyHash}`;
    const inCooldown = await this.redis.get(cooldownKey);
    if (inCooldown) {
      const rateLimitKey = `ratelimit:${keyHash}`;
      const stateRaw = await this.redis.get(rateLimitKey);
      const state: RateLimitState | null = stateRaw ? JSON.parse(stateRaw) : null;
      const remaining = state?.remaining ?? 0;
      this.logger.warn(`API key (${keyHash}) is in cooldown. remaining=${remaining}`);
      throw new LostArkCooldownError(keyHash);
    }

    // ── Execute request ────────────────────────────────────────────────────
    try {
      const url = `${this.BASE_URL}${options.path}`;
      const headers: Record<string, string> = {
        Authorization: `bearer ${apiKey}`,
        Accept: 'application/json',
        ...(options.method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
      };

      const response = await lastValueFrom(
        options.method === 'GET'
          ? this.http.get<T>(url, { headers, params: options.params, timeout })
          : this.http.post<T>(url, options.body, { headers, timeout }),
      );

      // Track rate-limit headers from a successful response
      await this.trackRateLimit(keyHash, response.headers as Record<string, any>);

      return response.data;
    } catch (err: any) {
      const status: number | undefined = err?.response?.status;
      const headers: Record<string, any> = err?.response?.headers ?? {};

      // Track rate-limit headers even when the request fails
      if (headers['x-ratelimit-remaining'] !== undefined) {
        await this.trackRateLimit(keyHash, headers);
      }

      this.logger.error(
        `LostArk API error: status=${status} path=${options.path} key=${keyHash}`,
      );

      if (status === 401) throw new LostArkApiKeyInvalidError(keyHash);
      if (status === 403) throw new LostArkApiForbiddenError(options.path);
      if (status === 429) {
        const retryAfter = parseInt(headers['retry-after'] ?? '60', 10);
        await this.setCooldown(keyHash, retryAfter);
        throw new LostArkRateLimitError(keyHash, retryAfter);
      }
      if (status !== undefined && status >= 500) {
        throw new LostArkApiServerError(status, options.path);
      }

      throw err;
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  /**
   * Persist rate-limit state from response headers and enter cooldown when
   * remaining drops below the safety threshold (< 10).
   */
  private async trackRateLimit(
    keyHash: string,
    headers: Record<string, any>,
  ): Promise<void> {
    const limit = parseInt(headers['x-ratelimit-limit'] ?? '0', 10);
    const remaining = parseInt(headers['x-ratelimit-remaining'] ?? '-1', 10);
    const resetAt = parseInt(headers['x-ratelimit-reset'] ?? '0', 10);

    // Skip if the headers were not present in the response
    if (remaining === -1) return;

    const state: RateLimitState = { limit, remaining, resetAt, updatedAt: Date.now() };
    const rateLimitKey = `ratelimit:${keyHash}`;
    const ttl = resetAt > 0 ? Math.max(resetAt - Math.floor(Date.now() / 1000), 60) : 60;
    await this.redis.set(rateLimitKey, JSON.stringify(state), ttl);

    this.logger.debug(
      `RateLimit key=${keyHash} remaining=${remaining}/${limit} resetAt=${resetAt}`,
    );

    if (remaining >= 0 && remaining < 10) {
      this.logger.warn(
        `Low rate limit remaining=${remaining} for key=${keyHash}, entering cooldown`,
      );
      await this.setCooldown(keyHash, Math.max(ttl, 30));
    }
  }

  /**
   * Set a cooldown flag in Redis so subsequent requests are blocked until it expires.
   */
  private async setCooldown(keyHash: string, seconds: number): Promise<void> {
    const cooldownKey = `ratelimit:cooldown:${keyHash}`;
    await this.redis.set(cooldownKey, '1', seconds);
    this.logger.warn(`Cooldown set for key=${keyHash} duration=${seconds}s`);
  }

  /**
   * Return a short, deterministic identifier for an API key that is safe to log.
   */
  private hashKey(apiKey: string): string {
    return createHash('sha256').update(apiKey).digest('hex').substring(0, 16);
  }
}
