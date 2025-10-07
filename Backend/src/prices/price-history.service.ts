// src/prices/price-history.service.ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

type GetSeriesOpts = {
  bucket: 'minute' | 'hour' | 'day';
  fromDays: number;
  minuteStep?: number; // minute 버킷일 때 간격(분)
  hourStep?: number; // hour 버킷일 때 간격(시간)
};

@Injectable()
export class PriceHistoryService {
  constructor(private ds: DataSource) {}

  /**
   * fromDays 구간을 bucket 단위로 집계해 시계열 반환
   * - bucket: 'minute' | 'hour' | 'day'
   * - minuteStep/hourStep으로 간격 조절 (기본: minute=10분, hour=1시간)
   */
  async getSeries(itemKey: string, opts: GetSeriesOpts) {
    const unit = opts.bucket; // 'minute' | 'hour' | 'day'
    const fromDays = opts.fromDays ?? 7;

    // generate_series step interval 계산
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

    // date_trunc(unit, ...) 에 들어갈 unit은 'minute' | 'hour' | 'day'
    // generate_series 간격은 interval 문자열(stepInterval)
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
}
