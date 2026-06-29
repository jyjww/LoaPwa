import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';

const RAW_RETENTION_DAYS = 14;

/**
 * PriceRetentionScheduler runs daily at KST 03:00 (UTC 18:00).
 *
 * Steps:
 * 1. Aggregate yesterday's price_history rows into daily_price_summary (INSERT ... ON CONFLICT UPDATE)
 * 2. Delete price_history rows older than 14 days
 *
 * No external API calls — reads/writes DB only.
 */
@Injectable()
export class PriceRetentionScheduler {
  private readonly logger = new Logger(PriceRetentionScheduler.name);

  constructor(private readonly ds: DataSource) {}

  // KST 03:00 = UTC 18:00
  @Cron('0 0 18 * * *')
  async handleCron(): Promise<void> {
    const runId = Date.now().toString(36);
    this.logger.log(`🗄️ [${runId}] PriceRetentionScheduler start`);

    try {
      await this.aggregateYesterday(runId);
    } catch (err: any) {
      this.logger.error(`❌ [${runId}] Aggregation failed: ${err?.message}`);
    }

    try {
      await this.purgeOldRaw(runId);
    } catch (err: any) {
      this.logger.error(`❌ [${runId}] Purge failed: ${err?.message}`);
    }

    this.logger.log(`✅ [${runId}] PriceRetentionScheduler done`);
  }

  private async aggregateYesterday(runId: string): Promise<void> {
    // Yesterday in KST (UTC+9): captured_at AT TIME ZONE 'Asia/Seoul'
    const result = await this.ds.query(`
      INSERT INTO daily_price_summary
        (item_id, date, min_price, max_price, avg_price, open_price, close_price, sample_count, source)
      SELECT
        item_id,
        (captured_at AT TIME ZONE 'Asia/Seoul')::date AS date,
        MIN(price::numeric)                            AS min_price,
        MAX(price::numeric)                            AS max_price,
        AVG(price::numeric)                            AS avg_price,
        (ARRAY_AGG(price::numeric ORDER BY captured_at ASC))[1]               AS open_price,
        (ARRAY_AGG(price::numeric ORDER BY captured_at DESC))[1]              AS close_price,
        COUNT(*)                                       AS sample_count,
        source
      FROM price_history
      WHERE
        (captured_at AT TIME ZONE 'Asia/Seoul')::date = (NOW() AT TIME ZONE 'Asia/Seoul')::date - INTERVAL '1 day'
      GROUP BY item_id, (captured_at AT TIME ZONE 'Asia/Seoul')::date, source
      ON CONFLICT (item_id, date) DO UPDATE SET
        min_price    = LEAST(daily_price_summary.min_price, EXCLUDED.min_price),
        max_price    = GREATEST(daily_price_summary.max_price, EXCLUDED.max_price),
        avg_price    = EXCLUDED.avg_price,
        close_price  = EXCLUDED.close_price,
        sample_count = daily_price_summary.sample_count + EXCLUDED.sample_count
      RETURNING item_id
    `);
    this.logger.log(
      `📊 [${runId}] Aggregated ${result.length} item(s) into daily_price_summary`,
    );
  }

  private async purgeOldRaw(runId: string): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RAW_RETENTION_DAYS);

    const result = await this.ds.query(
      `DELETE FROM price_history WHERE captured_at < $1`,
      [cutoff.toISOString()],
    );
    const deleted = result[1] ?? 0;
    this.logger.log(
      `🗑️ [${runId}] Purged ${deleted} raw price_history rows older than ${RAW_RETENTION_DAYS} days`,
    );
  }
}
