// src/prices/price-history.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RedisService } from '@/cache/redis.service';

type GetSeriesOpts = {
  bucket: 'minute' | 'hour' | 'day';
  fromDays: number;
  minuteStep?: number; // minute 버킷일 때 간격(분)
  hourStep?: number; // hour 버킷일 때 간격(시간)
};

@Injectable()
export class PriceHistoryService {
  private readonly log = new Logger(PriceHistoryService.name);

  constructor(
    private ds: DataSource,
    private redis: RedisService,
  ) {}

  /**
   * fromDays 구간을 bucket 단위로 집계해 시계열 반환
   *
   * 전략: Redis 우선 조회 → DB fallback
   * - Redis: price:hist:{itemKey} ZSET (score=ts, member=price)
   * - DB: price_history 테이블 (복잡한 집계 쿼리)
   */
  async getSeries(itemKey: string, opts: GetSeriesOpts) {
    const fromDays = opts.fromDays ?? 7;
    const now = Date.now();
    const fromMs = now - fromDays * 24 * 60 * 60 * 1000;

    // 1) Redis에서 조회 시도
    try {
      const redisData = await this.getSeriesFromRedis(itemKey, fromMs, now, opts);
      if (redisData && redisData.length > 0) {
        this.log.debug(`✅ Redis hit: ${itemKey} (${redisData.length} points)`);
        return redisData;
      }
    } catch (err) {
      this.log.warn(`⚠️ Redis query failed for ${itemKey}: ${(err as Error).message}`);
    }

    // 2) Redis에 없으면 DB fallback
    this.log.debug(`💾 DB fallback: ${itemKey}`);
    return this.getSeriesFromDB(itemKey, opts);
  }

  /**
   * Redis ZSET에서 가격 히스토리 조회 후 bucket 집계
   */
  private async getSeriesFromRedis(
    itemKey: string,
    fromMs: number,
    toMs: number,
    opts: GetSeriesOpts,
  ) {
    const histKey = `price:hist:${itemKey}`;

    // ZRANGEBYSCORE로 범위 조회 (WITHSCORES)
    const rawData = await this.redis.zrangebyscore(histKey, fromMs, toMs, true);

    if (!rawData || rawData.length === 0) {
      return null;
    }

    // rawData: [price1, ts1, price2, ts2, ...]
    const points: Array<{ ts: number; price: number }> = [];
    for (let i = 0; i < rawData.length; i += 2) {
      const price = parseFloat(rawData[i]);
      const ts = parseInt(rawData[i + 1], 10);
      if (!isNaN(price) && !isNaN(ts)) {
        points.push({ ts, price });
      }
    }

    if (points.length === 0) {
      return null;
    }

    // bucket 단위로 집계
    return this.aggregateToBucket(points, opts, fromMs, toMs);
  }

  /**
   * DB에서 가격 히스토리 조회 (기존 로직)
   */
  private async getSeriesFromDB(itemKey: string, opts: GetSeriesOpts) {
    const unit = opts.bucket;
    const fromDays = opts.fromDays ?? 7;

    let stepInterval = '1 hour';
    if (unit === 'minute') {
      const step = Math.max(1, Number(opts.minuteStep ?? 10));
      stepInterval = `${step} minutes`;
    } else if (unit === 'hour') {
      const step = Math.max(1, Number(opts.hourStep ?? 1));
      stepInterval = `${step} hours`;
    } else {
      stepInterval = `1 day`;
    }

    const rows = await this.ds.query(
      `
      WITH ts AS (
        SELECT generate_series(
          date_trunc($3, now() - ($2 || ' days')::interval),
          date_trunc($3, now()),
          $1::interval
        ) AS bucket_start
      ),
      agg AS (
        SELECT
          date_trunc($3, captured_at)    AS bucket_start,
          AVG(price)::numeric(12,2)      AS avg_price,
          MAX(captured_at)               AS last_at
        FROM price_history
        WHERE item_id = $4
          AND captured_at >= now() - ($2 || ' days')::interval
        GROUP BY 1
      )
      SELECT ts.bucket_start, a.avg_price, a.last_at
      FROM ts
      LEFT JOIN agg a USING (bucket_start)
      ORDER BY ts.bucket_start
      `,
      [stepInterval, fromDays, unit, itemKey],
    );

    return rows.map((r: any) => ({
      t: r.bucket_start,
      price: r.avg_price != null ? Number(r.avg_price) : null,
      lastAt: r.last_at ?? null,
    }));
  }

  /**
   * Redis raw 데이터를 bucket 단위로 집계
   */
  private aggregateToBucket(
    points: Array<{ ts: number; price: number }>,
    opts: GetSeriesOpts,
    fromMs: number,
    toMs: number,
  ) {
    const { bucket, minuteStep = 10, hourStep = 1 } = opts;

    // bucket 크기 계산 (ms)
    let bucketSizeMs: number;
    if (bucket === 'minute') {
      bucketSizeMs = minuteStep * 60 * 1000;
    } else if (bucket === 'hour') {
      bucketSizeMs = hourStep * 60 * 60 * 1000;
    } else {
      // day
      bucketSizeMs = 24 * 60 * 60 * 1000;
    }

    // bucket별 그룹화
    const buckets = new Map<number, Array<{ ts: number; price: number }>>();

    for (const point of points) {
      const bucketStart = Math.floor(point.ts / bucketSizeMs) * bucketSizeMs;
      if (!buckets.has(bucketStart)) {
        buckets.set(bucketStart, []);
      }
      buckets.get(bucketStart)!.push(point);
    }

    // 평균 계산 및 정렬
    const result = Array.from(buckets.entries())
      .map(([bucketStart, pts]) => {
        const avgPrice = pts.reduce((sum, p) => sum + p.price, 0) / pts.length;
        const lastTs = Math.max(...pts.map((p) => p.ts));
        return {
          t: new Date(bucketStart),
          price: Math.round(avgPrice * 100) / 100,
          lastAt: new Date(lastTs),
        };
      })
      .sort((a, b) => a.t.getTime() - b.t.getTime());

    return result;
  }
}
