import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePriceHistory1728386423456 implements MigrationInterface {
  name = 'CreatePriceHistory1728386423456';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS price_history (
        id BIGSERIAL PRIMARY KEY,
        item_id VARCHAR(64) NOT NULL,
        source  VARCHAR(32) NOT NULL DEFAULT 'api',
        price   NUMERIC(12,2) NOT NULL,
        captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        meta JSONB NULL
      )
    `);

    await q.query(`
      CREATE INDEX IF NOT EXISTS idx_price_history_item_time
      ON price_history (item_id, captured_at DESC)
    `);

    // 생성열 대신 일반 컬럼 + 백필
    await q.query(`
      ALTER TABLE price_history
      ADD COLUMN IF NOT EXISTS captured_minute TIMESTAMPTZ
    `);

    await q.query(`
      UPDATE price_history
      SET captured_minute = (date_trunc('minute', captured_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')
      WHERE captured_minute IS NULL
    `);

    // 유니크 인덱스 (한 번만! 중복 생성 제거)
    await q.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_price_hist_item_src_minute
      ON price_history (item_id, source, captured_minute)
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS uq_price_hist_item_src_minute`);
    await q.query(`DROP INDEX IF EXISTS idx_price_history_item_time`);
    await q.query(`DROP TABLE IF EXISTS price_history`);
  }
}
